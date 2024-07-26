const { Authflow } = require('prismarine-auth');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const bedrock = require('bedrock-protocol');
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';

// you could use realms api but to lazzy :D

const deviceMapping = {
  0: 'Unknown',
  1: 'Android',
  2: 'iOS',
  3: 'OSX (macOS)',
  4: 'FireOS',
  5: 'GearVR',
  6: 'Hololens',
  7: 'Windows 10 (x64)',
  8: 'Windows 10 (x86)',
  9: 'Dedicated Server',
  10: 'TvOS (Apple TV)',
  11: 'Orbis (PlayStation)',
  12: 'Nintendo Switch',
  13: 'Xbox',
  14: 'Windows Phone',
  15: 'Linux'
};

function getDeviceName(buildPlatform) {
  return deviceMapping[buildPlatform] || 'Unknown';
}

module.exports = {
  command: new SlashCommandBuilder()
    .setName('playerlist')
    .setDescription('Show how many and what ppl are in the Realm')
    .addStringOption(option =>
      option.setName('realmcode')
        .setDescription('Realm-Code')
        .setRequired(false)
        .setMinLength(11)
        .setMaxLength(11)
    )
    .addIntegerOption(option =>
      option.setName('realmid')
        .setDescription('Realm ID to get info')
        .setRequired(false)
    ),

  callback: async (interaction) => {
    try {
      const realmCode = interaction.options.getString('realmcode');
      const realmId = interaction.options.getInteger('realmid');

      if (!realmCode && !realmId) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription('You must provide either a realm code or a realm ID.')
              .setColor(16724787)
          ],
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply();

      const userIdentifier = 'unique_identifier';// food was yummy
      const cacheDir = './';
      const authFlow = new Authflow(userIdentifier, cacheDir);

      const bedrockClient = bedrock.createClient({
        authFlow: authFlow,
        DeviceModel: "Xbox Series X",
        DeviceOS: 13,
        realms: {
          realmInvite: realmCode ? `https://realms.gg/${realmCode}` : undefined,
          realmId: realmId ? realmId.toString() : undefined
        },
      });

      bedrockClient.on('join', () => {
        console.log('Successfully joined the realm');

        setTimeout(() => {
          bedrockClient.disconnect();
          console.log('Disconnected from the realm');
        }, 6000);

        bedrockClient.on('player_list', (packet) => {
          console.log('Player list received:', packet);

          if (!Array.isArray(packet.records.records)) {
            console.error('packet.records.records is not an array:', packet.records.records);
            return;
          }

          const playerList = packet.records.records.map((player) =>
            `${second} ${player.username}\n${second} UUID: ${player.uuid}\n${second} XUID: ${player.xbox_user_id ?? 'N/A'}\n${one} Device: ${getDeviceName(player.build_platform)}`).join('\n\n');
          const playerCount = packet.records.records.length;

          const embed = new EmbedBuilder()
            .setTitle(`Players on Realm`)
            .setDescription(`There are ${playerCount} Players online:\n\n${playerList}`)
            .setColor(1286414);

          interaction.editReply({ embeds: [embed] }).catch((error) => {
            console.error('Discord API error:', error);
          });
        });
      });

      bedrockClient.on('kick', async (reason) => {
        const kickEmbed = new EmbedBuilder()
          .setTitle('Client Kicked')
          .setDescription(`${reason.message}`)
          .setColor(16724787);
        interaction.editReply({ embeds: [kickEmbed] }).catch((error) => {
          console.error('Discord API error:', error);
        });
      });

      bedrockClient.on('error', (error) => {
        console.error('Error joining the realm:', error);
        const errorEmbed = new EmbedBuilder()
          .setTitle('Error Joining Realm')
          .setDescription(`Error while joining: ${error.message || error}`)
          .setColor(16724787);

        interaction.editReply({ embeds: [errorEmbed] }).catch((error) => {
          console.error('Discord API error:', error);
        });
      });

    } catch (e) {
      console.error('Error executing command:', e);
      const errorEmbed = new EmbedBuilder()
        .setDescription(`404 Realms could not be found in your Realms list\n${e.message || e}`)
        .setColor(16724787);

      interaction.editReply({ embeds: [errorEmbed] }).catch((error) => {
        console.error('Discord API error:', error);
      });
    }
  }
};
