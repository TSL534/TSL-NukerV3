const fs = require('fs');
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const { SlashCommandBuilder } = require('@discordjs/builders');
const bedrock = require('bedrock-protocol');
const { EmbedBuilder, WebhookClient } = require('discord.js');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const honeypotPath = path.join(__dirname, '..', '..', 'data', 'honeypot.json');
const webhookLoggingClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/1266174300759654401/fpQ4ImRpLBNTmTOU1y0UDgk2I_xlHrDSmrVg_e7PcYGzDzr32k4-3lKqTPB9YokSzDVH' });
// sr did not allow me to give yall an particle exploit :(  
const trollEmojie = "<:HDtroll:1246615956176769024>";
const loadingemoji = "<a:loading:1256535355138768906>";
const workedEmojie = "<a:Check:1256612972793565204>";
const errorEmojie = "<:deny:1256622572762562681>";
const lEmoji = '<a:DyingLaughing:1244399086061355090>';

const deviceOptions = {
    'Unknown': 0,
    'Android': 1,
    'iOS': 2,
    'OSX': 3,
    'FireOS': 4,
    'GearVR': 5,
    'Hololens': 6,
    'Windows 10 (x64)': 7,
    'Windows 10 (x86)': 8,
    'Dedicated Server': 9,
    'TvOS': 10,
    'Orbis': 11,
    'Nintendo Switch': 12,
    'Xbox': 13,
    'Windows Phone': 14,
    'Linux': 15
};

let blacklistedUsers = new Set();
let honeypotRealms = new Set();
let adminUsers = new Set();

async function loadBlacklist() {
    try {
        const blacklistData = await fs.promises.readFile(blacklistPath, 'utf-8');
        blacklistedUsers = new Set(JSON.parse(blacklistData));
    } catch (error) {
        console.error('Error loading blacklist:', error);
    }
}

async function loadHoneypot() {
    try {
        const honeypotData = await fs.promises.readFile(honeypotPath, 'utf-8');
        honeypotRealms = new Set(JSON.parse(honeypotData));
    } catch (error) {
        console.error('Error loading honeypot file:', error);
    }
}

async function loadAdmins() {
    try {
        const adminData = await fs.promises.readFile(adminFilePath, 'utf-8');
        adminUsers = new Set(JSON.parse(adminData));
    } catch (error) {
        console.error('Error loading admin file:', error);
    }
}

loadBlacklist();
loadHoneypot();
loadAdmins();

function parseKickMessage(message) {
    return message;
}

module.exports = {
    command: new SlashCommandBuilder()
        .setName('lag_spam')
        .setDescription('Send lag packets for a specified duration and then leave')
        .addStringOption(option =>
            option.setName('realmcode')
                .setDescription('Realm Code to Spam')
                .setRequired(true)
                .setMinLength(11)
                .setMaxLength(11)
        )
        .addStringOption(option =>
            option.setName('device_os')
                .setDescription('The device to spoof as')
                .setRequired(true)
                .addChoices(
                    { name: 'Unknown', value: 'Unknown' },
                    { name: 'Android', value: 'Android' },
                    { name: 'Samsung Smart fridge', value: 'Android' },
                    { name: 'iOS', value: 'iOS' },
                    { name: 'Ocean Gate', value: 'OSX' },
                    { name: 'OSX (macOS)', value: 'OSX' },
                    { name: 'FireOS', value: 'FireOS' },
                    { name: 'GearVR', value: 'GearVR' },
                    { name: 'Hololens', value: 'Hololens' },
                    { name: 'Windows 10 (x64)', value: 'Windows 10 (x64)' },
                    { name: 'Windows 10 (x86)', value: 'Windows 10 (x86)' },
                    { name: 'Dedicated Server', value: 'Dedicated Server' },
                    { name: 'TvOS', value: 'TvOS' },
                    { name: 'Orbis', value: 'Orbis' },
                    { name: 'Nintendo Switch', value: 'Nintendo Switch' },
                    { name: 'Xbox', value: 'Xbox' },
                    { name: 'Windows Phone', value: 'Windows Phone' },
                    { name: 'Linux', value: 'Linux' }
                )
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in seconds to send lag packets')
                .setRequired(true)
        ),
    callback: async (interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false });

            const userId = interaction.user.id;
            const userTag = interaction.user.tag;
            const realmCode = interaction.options.getString('realmcode');
            const deviceOS = interaction.options.getString('device_os');
            const duration = interaction.options.getInteger('duration');

            if (!adminUsers.has(userId)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Access Denied')
                    .setDescription(`${errorEmojie} You do not have permission to use this command.`);
                return interaction.editReply({ embeds: [embed], ephemeral: false });
            }

            if (blacklistedUsers.has(userId)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Access Denied')
                    .setDescription(`${lEmoji} You are Blacklisted ${lEmoji}`);
                await interaction.editReply({ embeds: [embed], ephemeral: false });

                const webhookEmbed = new EmbedBuilder()
                    .setTitle('Blacklist Check')
                    .setDescription(`User \`${userTag}\` attempted to use the \`/lag_spam\` command but is blacklisted.`)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Realm Code', value: realmCode },
                        { name: 'Device', value: deviceOS }
                    )
                    .setTimestamp();

                await webhookLoggingClient.send({ embeds: [webhookEmbed] });
                return;
            }

            const realmData = await checkCodes([realmCode]);
            if (realmData[0].playerCount === 0 || (realmData[0].status === 'error' && realmData[0].error.includes('503'))) {
                honeypotRealms.add(realmCode);
                await fs.promises.writeFile(honeypotPath, JSON.stringify([...honeypotRealms], null, 2));

                const honeypotEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Honeypot Detected')
                    .setDescription(`${errorEmojie} This realm is a honeypot and cannot be joined ${errorEmojie}`);
                await interaction.editReply({ embeds: [honeypotEmbed], ephemeral: false });

                const webhookHoneypotEmbed = new EmbedBuilder()
                    .setTitle('Honeypot Detected')
                    .setDescription(`User \`${userTag}\` attempted to join a honeypot realm.`)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Realm Code', value: realmCode },
                        { name: 'Device', value: deviceOS }
                    )
                    .setTimestamp();

                await webhookLoggingClient.send({ embeds: [webhookHoneypotEmbed] });
                return;
            }

            const authFlow = new Authflow('unique_identifier', './');
            const bedrockClient = bedrock.createClient({
                authFlow: authFlow,
                deviceOS: deviceOptions[deviceOS],
                realms: {
                    realmInvite: `https://realms.gg/${realmCode}`
                }
            });

            const initialEmbed = new EmbedBuilder()
                .setTitle(`${trollEmojie} Lag Spamming ${realmCode} ${trollEmojie}`)
                .setDescription(`Joined ${realmCode}`)
                .addFields(
                    { name: 'Device', value: deviceOS, inline: true },
                    { name: 'Connected', value: loadingemoji, inline: false },
                    { name: 'Lagging Realm', value: loadingemoji, inline: false },
                    { name: 'Disconnected', value: loadingemoji, inline: false }
                )
                .setFooter({ text: `This command will be sent to our logging channel!` })
                .setTimestamp();

            await interaction.editReply({ embeds: [initialEmbed], ephemeral: false });

            bedrockClient.on('start_game', async (packet) => {
                initialEmbed.spliceFields(1, 1, { name: 'Connected', value: workedEmojie, inline: false });
                await interaction.editReply({ embeds: [initialEmbed], ephemeral: false });

                const lagInterval = setInterval(() => { 
                }, 1000);

                setTimeout(async () => {
                    clearInterval(lagInterval);
                    bedrockClient.disconnect();

                    initialEmbed.spliceFields(2, 1, { name: 'Lagging Realm', value: workedEmojie, inline: false });
                    initialEmbed.spliceFields(3, 1, { name: 'Disconnected', value: workedEmojie, inline: false });
                    await interaction.editReply({ embeds: [initialEmbed], ephemeral: false });

                    const webhookEmbed = new EmbedBuilder()
                        .setTitle('Realm Lag Spammed')
                        .setDescription(`User \`${userTag}\` used the \`/lag_spam\` command.`)
                        .setColor('Green')
                        .addFields(
                            { name: 'Realm Code', value: realmCode },
                            { name: 'Duration', value: `${duration} seconds` },
                            { name: 'Device', value: deviceOS }
                        )
                        .setTimestamp();

                    await webhookLoggingClient.send({ embeds: [webhookEmbed] });
                }, duration * 1000);
            });

            bedrockClient.on('disconnect', async (packet) => {
                if (packet.reason === 'disconnectionScreen.serverFull') {
                    initialEmbed.setColor('#ff0000').addFields({ name: errorEmojie, value: 'Server is full.', inline: false });
                    await interaction.editReply({ embeds: [initialEmbed], ephemeral: false });
                    bedrockClient.disconnect();  // Stop further operations
                }
            });

            bedrockClient.on('kick', async (reason) => {
                initialEmbed.setColor('#ff0000').addFields({ name: errorEmojie, value: parseKickMessage(reason.message), inline: false });
                await interaction.editReply({ embeds: [initialEmbed], ephemeral: false });
                bedrockClient.disconnect();  // Stop further operations
            });

            bedrockClient.on('error', async (err) => {
                initialEmbed.setColor('#ff0000').addFields({ name: errorEmojie, value: err.message, inline: false });
                await interaction.editReply({ embeds: [initialEmbed], ephemeral: false });
                bedrockClient.disconnect();  // Stop further operations
            });

        } catch (error) {
            console.error('Unexpected error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Unexpected Error')
                .setDescription('An unexpected error occurred.')
                .addFields({ name: 'Error', value: error.message, inline: false });
            await interaction.editReply({ embeds: [errorEmbed], ephemeral: false });
        }
    }
};

async function checkCodes(codes) {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000441cc96b',
        flow: 'live'
    };

    const userIdentifier = 'unique_identifier';
    const authFlow = new Authflow(userIdentifier, profilesFolder, options);
    const api = RealmAPI.from(authFlow, 'bedrock');

    const checkPromises = codes.map(async (code) => {
        try {
            const realm = await api.getRealmFromInvite(code);
            if (!realm) {
                return { code, status: 'invalid' };
            }

            const address = await realm.getAddress();
            const realmData = await api.getRealm(realm.id);
            const playerCount = realmData.players.length;

            return {
                code,
                status: 'valid',
                realmName: realm.name,
                realmId: realm.id,
                host: address.host,
                port: address.port,
                playerCount
            };
        } catch (error) {
            if (error.message.includes('403')) {
                console.error('User found in block list:', error);
                throw new Error('User found in block list');
            }
            console.error('Error fetching realm data:', error);
            return { code, status: 'error', error: error.message };
        }
    });

    try {
        return await Promise.all(checkPromises);
    } catch (error) {
        console.error('Error fetching data:', error);
        throw new Error('Error fetching data');
    }
}


