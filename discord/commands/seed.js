const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { Authflow } = require('prismarine-auth');
const bedrock = require('bedrock-protocol');
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

const loading = '<a:loading:1256535355138768906>';
const check = '<a:Check:1256612972793565204>';
const cross = '<:minecraft_deny:1244399374159577218>';
const none = '<a:loading:1256535355138768906>';

function createBot(realmCode, deviceOS, userId) {
  return bedrock.createClient({
    realms: {
      realmInvite: realmCode,
    },
    authFlow: new Authflow(userId, './'),
    deviceOS: deviceOptions[deviceOS],
    
  });
}

function parseKickMessage(message) {
  return message;
}

module.exports = {
  command: new SlashCommandBuilder()
    .setName('seed')
    .setDescription('Find the seed of the realm.')
    .addStringOption(option =>
      option.setName('code')
        .setDescription('The realm code to join')
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
          { name: 'iOS', value: 'iOS' },
          { name: 'OSX', value: 'OSX' },
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
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;
    const realmCode = interaction.options.getString('code');
    const deviceOS = interaction.options.getString('device_os');

    const embed = new EmbedBuilder()
      .setTitle('Seed')
      .setDescription(` ${loading} Joining realm\n Finding seed`)
      .setColor(65280)
      .setFooter({ text: `/seed ` });

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    try {
      const client = createBot(realmCode, deviceOS, userId);

      client.on('start_game', async (packet) => {
        const seed = packet.seed;
        client.disconnect();

        embed.setDescription(`${second}${check} Joining realm\n${second}${check} Grabbing seed\n${second}Seed: ${seed}\n${one}[Chunkbase](https://www.chunkbase.com/apps/seed-map#${seed})`);
        await message.edit({
          embeds: [embed]
        });
      });

      client.on('kick', async (reason) => {
        embed.setColor(16729871)
          .setDescription(`${second}${cross} Joining  realm\n${second}${none} Grabbing seed\n${one}Error : ${parseKickMessage(reason.message)}`);

        await message.edit({ embeds: [embed] });
      });

      client.on('error', async (error) => {
        embed.setColor(16729871)
          .setDescription(`${second}${cross} Joining realm\n${second}${none} Grabbing seed\n${second} Error ${error.message}`);

        await message.edit({ embeds: [embed] });
      });

    } catch (error) {
      embed.setColor(16729871)
        .setDescription(`${second}${cross} Joining realm\n${second}${none} Grabbing seed\n${second} Error: ${error.message}`);

      await message.edit({ embeds: [embed] });
    }
  }
};
