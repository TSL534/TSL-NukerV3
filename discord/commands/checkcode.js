const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs').promises;
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');

const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const lEmoji = '<a:DyingLaughing:1244399086061355090>';

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const userIdentifier = 'unique_identifier'; // im hungry
const loggingWebhookUrl = '';
const webhookClient = new WebhookClient({ url: loggingWebhookUrl });

let blacklistedUsers = new Set();

async function loadBlacklist() {
    try {
        const blacklistData = await fs.readFile(blacklistPath, 'utf-8');
        blacklistedUsers = new Set(JSON.parse(blacklistData));
    } catch (error) {
        console.error('Failed to load blacklist file', error);
    }
}

loadBlacklist();

const checkCodesHTTP = async (codes) => {
    const checkPromises = codes.map(async (code) => {
        const url = `https://open.minecraft.net/pocket/realms/invite/${code}`;
        console.log(`Checking URL: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) return { code, status: 'invalid', realmName: 'N/A' };
                throw new Error(`Could not connect to ${code} - ${response.status} ${response.statusText}`);
            }
            const htmlText = await response.text();
            const dom = new JSDOM(htmlText);
            const realmNameElement = dom.window.document.querySelector('h1.open-realm__name');
            const realmName = realmNameElement ? realmNameElement.textContent.trim() : 'Unknown';
            return { code, status: 'valid', realmName };
        } catch (error) {
            console.error(`Error fetching data for code ${code}:`, error);
            return { code, status: 'error', error: error.message, realmName: 'N/A' };
        }
    });

    return Promise.all(checkPromises);
};

const checkCodesAPI = async (codes) => {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000441cc96b',
        flow: 'live'
    };

    const authFlow = new Authflow(userIdentifier, profilesFolder, options);
    const api = RealmAPI.from(authFlow, 'bedrock');

    const checkPromises = codes.map(async (code) => {
        try {
            const realm = await api.getRealmFromInvite(code);
            if (!realm) {
                return { code, status: 'invalid', realmName: 'N/A' };
            }

            const address = await realm.getAddress();
            return {
                code,
                status: 'valid',
                realmName: realm.name,
                realmId: realm.id,
                host: address.host,
                port: address.port
            };
        } catch (error) {
            console.error(`${console.red}[Error]${console.white}Error fetching realm data:`, error);
            return { code, status: 'error', error: error.message, realmName: 'N/A' };
        }
    });

    return Promise.all(checkPromises);
};

module.exports = {
    command: new SlashCommandBuilder()
        .setName('checkrealmcode')
        .setDescription("Check up to 5 specific Realm Codes.")
        .addStringOption(option =>
            option.setName('method')
                .setDescription('Choose the method to check the realm codes: http or api.')
                .setRequired(true)
                .addChoices(
                    { name: 'Website Request', value: 'http' },
                    { name: 'Realm API', value: 'api' }))
        .addStringOption(option =>
            option.setName('code1')
                .setDescription('Enter the first realm code.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('code2')
                .setDescription('Enter the second realm code (optional).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('code3')
                .setDescription('Enter the third realm code (optional).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('code4')
                .setDescription('Enter the fourth realm code (optional).')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('code5')
                .setDescription('Enter the fifth realm code (optional).')
                .setRequired(false)),

    callback: async (interaction) => {
        await interaction.deferReply({ ephemeral: false });

        if (blacklistedUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Womp Womp')
                .setDescription(`${lEmoji} You are blacklisted ${lEmoji}`);
            await interaction.editReply({ embeds: [embed], ephemeral: true });

            // Logging to webhook
            const logEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Blacklisted User Attempted Command')
                .setDescription(`User ${interaction.user.tag} (${interaction.user.id}) attempted to use the checkrealmcode command.`)
                .addFields({ name: 'Attempted Codes', value: interaction.options.getString('code1') + ', ' + interaction.options.getString('code2') + ', ' + interaction.options.getString('code3') + ', ' + interaction.options.getString('code4') + ', ' + interaction.options.getString('code5') })
                .setTimestamp();
            try {
                await webhookClient.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error('Error sending to webhook:', error);
            }

            return;
        }

        const inputCodes = [
            interaction.options.getString('code1'),
            interaction.options.getString('code2'),
            interaction.options.getString('code3'),
            interaction.options.getString('code4'),
            interaction.options.getString('code5')
        ].filter(code => code);

        if (inputCodes.length < 1) {
            await interaction.editReply({
                content: 'Please enter at least one valid code.',
                ephemeral: true
            });
            return;
        }

        const method = interaction.options.getString('method');

        try {
            console.log('Checking codes:', inputCodes);
            const codesWithStatus = method === 'http' ? await checkCodesHTTP(inputCodes) : await checkCodesAPI(inputCodes);
            console.log('Checked codes status:', codesWithStatus);

            const embed = new EmbedBuilder()
                .setTitle('Checked Realm Codes')
                .setColor('#00FF00');

            const logEmbed = new EmbedBuilder()
                .setTitle('Checked Realm Codes Log')
                .setColor('#00FF00')
                .setDescription(`User ${interaction.user.tag} (${interaction.user.id}) used the checkrealmcode command.`)
                .setTimestamp();

            codesWithStatus.forEach((item, index) => {
                const statusEmoji = item.status === 'valid' ? accseptEmoji : errorEmoji;
                embed.addFields(
                    { name: `Code ${index + 1}`, value: item.code, inline: true },
                    { name: 'Status', value: `${statusEmoji} ${item.status}`, inline: true },
                    { name: 'Realm Name', value: item.realmName, inline: true }
                );

                logEmbed.addFields(
                    { name: `Code ${index + 1}`, value: item.code, inline: true },
                    { name: 'Status', value: item.status, inline: true },
                    { name: 'Realm Name', value: item.realmName, inline: true }
                );

                if (item.error) {
                    embed.addFields({ name: 'Error', value: item.error, inline: true });
                    logEmbed.addFields({ name: 'Error', value: item.error, inline: true });
                }
            });

            await interaction.editReply({ embeds: [embed] });
            try {
                await webhookClient.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error('Error sending to webhook:', error);
            }

        } catch (error) {
            console.error('Error responding to interaction:', error);
            await interaction.editReply(`An error has occurred: ${error.message}`);
        }
    }
};
