const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const fs = require('fs');
const path = require('path');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const accountnames = ['FaintScarf13276']; // do NOT change
const userIdentifier = 'unique_identifier';
const cacheDir = './';
const profilesFolder = './';
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';

let blacklistedUsers = new Set();

async function loadBlacklist() {
  try {
    const blacklistData = await fs.promises.readFile(blacklistPath, 'utf-8');
    blacklistedUsers = new Set(JSON.parse(blacklistData));
  } catch (error) {
    console.error('Fehler beim Laden der Blacklist:', error);
  }
}

loadBlacklist();

module.exports = {
  command: new SlashCommandBuilder()
    .setName('get_ip')
    .setDescription('Gets the IP and port of a Minecraft Realm.')
    .addStringOption(option =>
      option.setName('realmcode')
        .setDescription('Realm code to get the IP and port of')
        .setRequired(true)
        .setMinLength(11)
        .setMaxLength(11)
    ),

  callback: async (interaction) => {
    try {
      const userId = interaction.user.id;
      if (blacklistedUsers.has(userId)) {
        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('Womp Womp')
          .setDescription(`${lEmoji} You are blacklsited ${lEmoji}`);
        try {
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
          console.error('Error sending embed message:', error);
        }
        return;
      }

      const realmCode = interaction.options.getString('realmcode');
      console.log(`Realm code received: ${realmCode}`);

      try {
        await interaction.deferReply();
      } catch (error) {
        console.error('Error deferring reply:', error);
      }

      const authFlow = new Authflow(userIdentifier, cacheDir);
      const realmInfo = await getRealmIP(authFlow, realmCode);

      if (realmInfo.error) {
        throw new Error(realmInfo.error);
      }

      console.log(`Realm Info - Host: ${realmInfo.host}, Port: ${realmInfo.port}`);

      const embed = new EmbedBuilder()
        .setTitle(`Ip Info from : ${realmCode}`)
        .setDescription(`${second}**IP**: ${realmInfo.host}\n${one}**Port**: ${realmInfo.port}`)
        .setColor(136);

      try {
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error editing reply:', error);
      }
    } catch (e) {
      console.error('Error executing command:', e);
      const errorEmbed = new EmbedBuilder()
        .setDescription(`Error fetching the realm IP information: ${e.message || e}`)
        .setColor(16724787);

      try {
        await interaction.editReply({ embeds: [errorEmbed] });
      } catch (error) {
        console.error('Error sending error embed message:', error);
      }
    }
  }
};

async function getRealmIP(authFlow, realmCode) {
  const options = {
    authTitle: '00000000441cc96b',
    flow: 'live'
  };

  try {
    const authflow = new Authflow(accountnames[0], profilesFolder, options);
    const api = RealmAPI.from(authflow, 'bedrock');

    const realm = await api.getRealmFromInvite(realmCode);
    if (!realm) {
      throw new Error('Could not find the Realm. The authenticated account must be the owner or invited to the Realm.');
    }

    const address = await realm.getAddress();
    console.log('Address obtained:', address);

    const realmInfo = { host: address.host, port: address.port };
    console.log('Realm Info to be returned:', realmInfo);

    return realmInfo;
  } catch (error) {
    console.error('Error getting realm IP:', error);
    return { error: 'Failed to grab the IP', error };
  }
}
