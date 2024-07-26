const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');

const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const whitelistPath = path.join(__dirname, '..', '..', 'data', 'whitelist.json');
const userIdentifier = 'unique_identifier';
const cacheDir = './';
const accountnames = ['FaintScarf13276'];// do NOT change this

module.exports = {
    command: new SlashCommandBuilder()
        .setName('summaryinfo')
        .setDescription('See How many Realm Codes we have in the Realmlist and Database.'),

    callback: async (interaction) => {
        try {
            await interaction.deferReply();

            // Load code counts from database and whitelist
            const databaseData = await fs.readFile(databasePath, 'utf-8');
            const whitelistData = await fs.readFile(whitelistPath, 'utf-8');

            const database = databaseData.trim() ? JSON.parse(databaseData) : [];
            const whitelist = whitelistData.trim() ? JSON.parse(whitelistData) : [];

            const databaseCount = database.length;
            const whitelistCount = whitelist.length;

            // Get realm count information
            const authFlow = new Authflow(accountnames[0], cacheDir);
            const api = RealmAPI.from(authFlow, 'bedrock');
            const realmsList = await api.getRealms();
            const realmCount = realmsList.length;
            const onlineRealms = realmsList.filter(realm => realm.state === 'OPEN').length;
            const offlineRealms = realmCount - onlineRealms;

            // Building the response embed
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('Realms:')
                .addFields(
                    { name: 'Database Codes', value: `${databaseCount}`, inline: true },
                    { name: 'Whitelist Codes', value: `${whitelistCount}`, inline: true },
                    { name: 'Total Realms', value: `${realmCount}`, inline: true },
                    { name: 'Online Realms', value: `${onlineRealms}`, inline: true },
                    { name: 'Offline Realms', value: `${offlineRealms}`, inline: true }
                )
                .setTimestamp();

            try {
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Error sending summary information response:', error);
            }
        } catch (error) {
            console.error('Error responding to interaction:', error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Error')
                .setDescription(`An error has occurred while processing your request: ${error.message}`);

            try {
                await interaction.editReply({ embeds: [embed], ephemeral: true });
            } catch (sendError) {
                console.error('Error sending error response:', sendError);
            }
        }
    }
};
