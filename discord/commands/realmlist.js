const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const accountnames = ['FaintScarf13276'];

module.exports = {
  command: new SlashCommandBuilder()
    .setName('listrealms')
    .setDescription('Lists all realms in your realm list with their IDs.'),

  callback: async (interaction) => {
    try {
      await interaction.deferReply(); // Acknowledge the interaction immediately

      const userIdentifier = 'unique_identifier';
      const cacheDir = './';
      const authFlow = new Authflow(userIdentifier, cacheDir);

      const realmsList = await listRealms(authFlow);

      if (realmsList.errorMsg) {
        throw new Error(realmsList.errorMsg);
      }

      // Pagination variables
      let page = 0;
      const itemsPerPage = 5;
      const totalPages = Math.ceil(realmsList.length / itemsPerPage);

      // Function to generate embed
      const generateEmbed = (start) => {
        const current = realmsList.slice(start, start + itemsPerPage);

        const embed = new EmbedBuilder()
          .setTitle('Realms List')
          .setColor(139)
          .setDescription(
            current.map(realm => `**Name**: ${realm.name}\n**ID**: ${realm.id}\n**Status**: ${realm.state === 'OPEN' ? 'Open' : 'Closed'}\n**Players**: ${realm.playerCount}/11`).join('\n\n')
          )
          .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

        return embed;
      };

      // Function to generate action row with buttons
      const generateActionRow = () => {
        return new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('previous')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === totalPages - 1)
          );
      };

      // Send initial message with embed and buttons
      const embedMessage = await interaction.editReply({ embeds: [generateEmbed(0)], components: [generateActionRow()] });

      // Create a collector to handle button interactions
      const filter = (i) => i.customId === 'previous' || i.customId === 'next';
      const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (i) => {
        if (i.customId === 'previous' && page > 0) {
          page--;
        } else if (i.customId === 'next' && page < totalPages - 1) {
          page++;
        }

        await i.update({ embeds: [generateEmbed(page * itemsPerPage)], components: [generateActionRow()] });
      });

      collector.on('end', () => {
        // Disable buttons after the collector ends
        const disabledRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('previous')
              .setLabel('Previous')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('next')
              .setLabel('Next')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true)
          );
        interaction.editReply({ components: [disabledRow] });
      });

    } catch (e) {
      console.error('Error executing command:', e);
      const errorEmbed = new EmbedBuilder()
        .setDescription(`Error fetching realms list: ${e.message || e}`)
        .setColor(16724787);

      interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};

async function listRealms(authFlow) {
  const profilesFolder = './';
  const options = {
    authTitle: '00000000441cc96b',
    flow: 'live'
  };

  const authflow = new Authflow(accountnames[0], profilesFolder, options);
  const api = RealmAPI.from(authflow, 'bedrock');

  let realmsList;
  try {
    realmsList = await api.getRealms();
  } catch (error) {
    throw new Error('Could not retrieve realms list');
  }

  for (const realm of realmsList) {
    try {
      const playerCount = await getCurrentPlayerCount(authFlow, realm.id);
      realm.playerCount = playerCount !== undefined ? playerCount : 'N/A';
    } catch (error) {
      realm.playerCount = 'N/A';
    }
  }

  return realmsList;
}

async function getCurrentPlayerCount(authFlow, realmId) {
  const profilesFolder = './';
  const options = {
    authTitle: '00000000441cc96b',
    flow: 'live'
  };

  try {
    const api = RealmAPI.from(authFlow, 'bedrock');
    const realmData = await api.getRealm(realmId);
    const currentPlayers = realmData.players.filter(player => player.online).length;
    return currentPlayers;
  } catch (error) {
    console.error('Error getting realm player count:', error);
    return undefined;
  }
}
