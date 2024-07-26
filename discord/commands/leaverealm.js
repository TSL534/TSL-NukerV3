const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const fs = require('fs');
const path = require('path');

// Pfade zu den JSON-Dateien
const realmsPath = path.join(__dirname, '..', '..', 'data', 'realms.json');
const adminPath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';

module.exports = {
  command: new SlashCommandBuilder()
    .setName('removeralm')
    .setDescription('Remove a realm from your realm list by its ID or code.')
    .addStringOption(option =>
      option.setName('realmcode')
        .setDescription('Realm code to remove')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('realmid')
        .setDescription('Realm ID to remove')
        .setRequired(false)
    ),
  callback: async (interaction) => {
    const userId = interaction.user.id;

    // Überprüfen, ob der Benutzer in der admin.json Datei ist
    let adminData;
    try {
      adminData = fs.readFileSync(adminPath, 'utf-8');
    } catch (error) {
      console.error('Error reading admin file:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Error')
            .setDescription(`Unable to verify admin permissions`)
            .setColor(0xff0000)
        ],
        ephemeral: true
      });
      return;
    }

    const admins = JSON.parse(adminData);
    if (!admins.includes(userId)) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Cope')
            .setDescription(`${errorEmoji} This Command is Staff only ${errorEmoji}`)
            .setColor(0xff0000)
        ],
        ephemeral: true
      });
      return;
    }

    const realmCode = interaction.options.getString('realmcode');
    const realmId = interaction.options.getInteger('realmid');

    if (!realmCode && !realmId) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Error')
            .setDescription(`${errorEmoji}Missing a realm code or a realm ID${errorEmoji}`)
            .setColor(0xff0000)
        ],
        ephemeral: true
      });
      return;
    }

    try {
      const realmsData = fs.readFileSync(realmsPath, 'utf-8');
      const realms = JSON.parse(realmsData);

      const realmIndex = realms.findIndex(realm => realmCode ? realm.code === realmCode : realm.id === realmId);

      if (realmIndex === -1) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Error')
              .setDescription('The specified realm was not found in your realm list.')
              .setColor(0xff0000)
          ],
          ephemeral: true
        });
        return;
      }

      // Realm aus der Liste entfernen
      const removedRealm = realms.splice(realmIndex, 1)[0];

      // Aktualisierte Realms-Liste in die JSON-Datei speichern
      fs.writeFileSync(realmsPath, JSON.stringify(realms, null, 2));

      // Realm mithilfe der Realm API verlassen
      const userIdentifier = 'unique_identifier'; //https://www.youtube.com/watch?v=scK8GkS8-MM  good song 
      const cacheDir = './';
      const authFlow = new Authflow(userIdentifier, cacheDir);
      const api = RealmAPI.from(authFlow, 'bedrock');

      await api.leaveRealm(removedRealm.id);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Success')
            .setDescription(`The specified realm has been removed from your realm list and you have left the realm.`)
            .setColor(0x00ff00)
        ],
        ephemeral: true
      });
    } catch (error) {
      console.error('Error removing the realm:', error);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Error')
            .setDescription('There was an error removing the realm. Please try again later.')
            .setColor(0xff0000)
        ],
        ephemeral: true
      });
    }
  }
};
