const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const accountnames = ['FaintScarf13276']; 
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';

module.exports = {
    command: new SlashCommandBuilder()
        .setName('realmdump')
        .setDescription('Get info from a realm.')
        .addStringOption(option =>
            option.setName('realmcode')
                .setDescription('Realm code to join')
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
                        {
                            description: 'You must provide either a realm code or a realm ID.',
                            color: 16724787
                        }
                    ],
                    ephemeral: true
                });
                return;
            }

            await interaction.deferReply();

            const userIdentifier = 'unique_identifier';
            const cacheDir = './';
            const authFlow = new Authflow(userIdentifier, cacheDir);

            let realmInfo;
            if (realmCode) {
                console.log(`Realm code received: ${realmCode}`);
                realmInfo = await realmLookupByCode(realmCode, authFlow);
            } else {
                console.log(`Realm ID received: ${realmId}`);
                realmInfo = await realmLookupById(realmId, authFlow);
            }

            if (realmInfo.errorMsg) {
                throw new Error(realmInfo.errorMsg);
            }

            let ownerUsername = 'N/A';
            try {
                ownerUsername = await getUsernameFromUUID(realmInfo.ownerUUID);
            } catch (error) {
                console.error('Error fetching username from UUID:', error);
            }

            let description;
            if (realmCode) {
                description = `
                    ${second}**Name**: ${realmInfo.name || 'N/A'}
                    ${second}**MOTD**: ${realmInfo.motd || 'N/A'}
                    ${second}**ID**: ${realmInfo.id || 'N/A'}
                    ${second}**Realm Code**: ${realmCode || 'Not available'}
                    ${second}**Club ID**: ${realmInfo.clubId || 'N/A'}
                    ${second}**Owner**: ${ownerUsername}
                    ${second}**Owner UUID**: ${realmInfo.ownerUUID || 'N/A'}
                    ${second}**Member**: ${realmInfo.member ? 'Yes' : 'No'}
                    ${second}**Max Players**: ${realmInfo.maxPlayers || 'N/A'}
                    ${second}**Active Slot**: ${realmInfo.activeSlot || 'N/A'}
                    ${second}**World Type**: ${realmInfo.worldType || 'N/A'}
                    ${second}**Default Permission**: ${realmInfo.defaultPermission || 'N/A'}
                    ${second}**State**: ${realmInfo.state || 'N/A'}
                    ${second}**Remote Subscription ID**: ${realmInfo.remoteSubscriptionId || 'N/A'}
                    ${second}**Days Left**: ${realmInfo.daysLeft || 'N/A'}
                    ${second}**Expired**: ${realmInfo.expired ? 'Yes' : 'No'}
                    ${second}**Expired Trial**: ${realmInfo.expiredTrial ? 'Yes' : 'No'}
                    ${one}**Grace Period**: ${realmInfo.gracePeriod ? 'Yes' : 'No'}
                `;
            } else {
                // Check the database for the realm code using the realm ID
                let foundRealmCode = 'Not found';
                try {
                    const rawData = await fs.readFile(databasePath, 'utf-8');
                    const database = JSON.parse(rawData);
                    const entry = database.find(item => item['Realm ID'] === realmId);
                    if (entry) {
                        foundRealmCode = entry['Realm Code'];
                    }
                } catch (error) {
                    console.error('Error reading database:', error);
                }

                description = `
                    ${second}**Name**: ${realmInfo.name || 'N/A'}
                    ${second}**Realm Code**: ${foundRealmCode || 'Not available'}
                    ${second}**Realm ID**: ${realmInfo.id || 'N/A'}
                    ${second}**Club ID**: ${realmInfo.clubId || 'N/A'}
                    ${second}**Owner**: ${ownerUsername}
                    ${second}**Owner UUID**: ${realmInfo.ownerUUID || 'N/A'}
                    ${second}**Member**: ${realmInfo.member ? 'Yes' : 'No'}
                    ${second}**Max Players**: ${realmInfo.maxPlayers || 'N/A'}
                    ${second}**Active Slot**: ${realmInfo.activeSlot || 'N/A'}
                    ${one}**State**: ${realmInfo.state || 'N/A'}
                `;
            }

            const embed = new EmbedBuilder()
                .setTitle(`Realm Info for ${realmCode || 'ID ' + realmId}`)
                .setDescription(description)
                .setColor(1286414);

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            console.error('Error executing command:', e);
            const errorEmbed = new EmbedBuilder()
                .setDescription(`Fehler beim Abrufen der Realm-Informationen: ${e.message || e}`)
                .setColor(16724787);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

async function realmLookupByCode(realmCode, authFlow) {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000441cc96b',
        flow: 'live'
    };

    const authflow = new Authflow(accountnames[0], profilesFolder, options);
    const api = RealmAPI.from(authflow, 'bedrock');

    let realm;
    try {
        realm = await api.getRealmFromInvite(realmCode);
    } catch (error) {
        throw new Error('Could not find the Realm. The authenticated account must be the owner or invited to the Realm.');
    }

    return extractRealmInfo(realm);
}

async function realmLookupById(realmId, authFlow) {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000441cc96b',
        flow: 'live'
    };

    const authflow = new Authflow(accountnames[0], profilesFolder, options);
    const api = RealmAPI.from(authflow, 'bedrock');

    let realm;
    try {
        realm = await api.getRealm(realmId);
    } catch (error) {
        throw new Error('Could not find the Realm. The authenticated account must be the owner or invited to the Realm.');
    }

    return extractRealmInfo(realm);
}

async function extractRealmInfo(realm) {
    const {
        id,
        remoteSubscriptionId,
        ownerUUID,
        name,
        motd,
        defaultPermission,
        state,
        daysLeft,
        expired,
        expiredTrial,
        gracePeriod,
        worldType,
        maxPlayers,
        activeSlot,
        clubId,
        member
    } = realm;

    let ownerUsername;
    try {
        ownerUsername = await getUsernameFromUUID(ownerUUID);
    } catch (error) {
        console.error('Error fetching owner username:', error);
        ownerUsername = 'N/A';
    }

    return {
        id,
        remoteSubscriptionId,
        owner: ownerUsername,
        ownerUUID,
        name,
        motd,
        defaultPermission,
        state,
        daysLeft,
        expired,
        expiredTrial,
        gracePeriod,
        worldType,
        maxPlayers,
        activeSlot,
        member,
        clubId
    };
}

async function getUsernameFromUUID(uuid) {
  try {
    const response = await fetch(`https://api.mojang.com/user/profiles/${uuid}/names`);
    if (!response.ok) {
      console.log(`Error fetching username: ${response.statusText}`);
      return 'N/A';
    }
    const data = await response.json();
    return data[0].name; // Return the latest known name
  } catch (error) {
    console.error('Error fetching username from UUID:', error);
    return 'N/A';
  }
}
