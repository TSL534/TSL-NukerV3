const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');

// this command is most likly broken to lazzy to fix :D

const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const whitelistPath = path.join(__dirname, '..', '..', 'data', 'whitelist.json');
const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const lEmoji = '<a:DyingLaughing:1244399086061355090>';

const checkCodesWebsite = async (filePath) => {
    let rawData = await fs.readFile(filePath, 'utf-8');
    let list = JSON.parse(rawData);
    let totalChecked = 0;
    let totalRemoved = 0;
    const validItems = [];
     
    for (const item of list) {
        const url = `https://open.minecraft.net/pocket/realms/invite/${item['Realm Code']}`;
        try {
            const response = await fetch(url);
            console.log(`Checking URL: ${url} - Status: ${response.status} ${response.statusText}`);
            totalChecked++;
            if (response.ok) {
                validItems.push(item);
            } else if (response.status === 404) {
                totalRemoved++;
            } else {
                validItems.push(item);  
            }
        } catch (error) {
            console.error('An error occurred:', item['Realm Code'], error);
            validItems.push(item);  
        }
    }

    if (totalRemoved > 0 && validItems.length > 0) {
        await fs.writeFile(filePath, JSON.stringify(validItems, null, 2));
    }

    return { totalChecked, totalRemoved, listName: path.basename(filePath, '.json') };
};

const checkCodesAPI = async (filePath) => {
    let rawData = await fs.readFile(filePath, 'utf-8');
    let list = JSON.parse(rawData);
    let totalChecked = 0;
    let totalRemoved = 0;
    const validItems = [];

    const userIdentifier = 'unique_identifier';
    const cacheDir = './';
    const authFlow = new Authflow(userIdentifier, cacheDir);
    const api = RealmAPI.from(authFlow, 'bedrock');

    for (const item of list) {
        try {
            const realm = await api.getRealmByInvite(item['Realm Code']);
            console.log(`Checking Realm Code: ${item['Realm Code']} - Realm ID: ${realm.id}`);
            totalChecked++;
            validItems.push(item);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log(`Realm Code ${item['Realm Code']} not found.`);
                totalRemoved++;
            } else {
                console.error('An error occurred:', item['Realm Code'], error);
                validItems.push(item);  
            }
        }
    }

    if (totalRemoved > 0 && validItems.length > 0) {
        await fs.writeFile(filePath, JSON.stringify(validItems, null, 2));
    }

    return { totalChecked, totalRemoved, listName: path.basename(filePath, '.json') };
};

module.exports = {
    command: new SlashCommandBuilder()
        .setName('check_codes')
        .setDescription('Checks all realm codes in the database or whitelist, and removes invalid ones.')
        .addStringOption(option =>
            option.setName('list')
                .setDescription('Choose the list to check (database or whitelist).')
                .setRequired(true)
                .addChoices(
                    { name: 'database', value: 'database' },
                    { name: 'whitelist', value: 'whitelist' }
                ))
        .addStringOption(option =>
            option.setName('method')
                .setDescription('Choose the method to check the codes (website or realmsapi).')
                .setRequired(true)
                .addChoices(
                    { name: 'website', value: 'website' },
                    { name: 'realmsapi (do not use)', value: 'realmsapi' }
                )),

    callback: async (interaction) => {
        await interaction.deferReply({ ephemeral: false });

        const adminData = await fs.readFile(adminFilePath, 'utf-8');
        const blacklistedData = await fs.readFile(blacklistPath, 'utf-8');
        const adminUsers = new Set(JSON.parse(adminData));
        const blacklistedUsers = new Set(JSON.parse(blacklistedData));

        if (blacklistedUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Womp Womp')
                .setDescription(`${lEmoji} You are Blacklisted ${lEmoji}`);
            try {
                await interaction.editReply({ embeds: [embed], ephemeral: false });
            } catch (error) {
                console.error('Error sending blacklist response:', error);
            }
            return;
        }

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Cope')
                .setDescription(`${errorEmoji} This is a Staff Command ${errorEmoji}`);
            try {
                await interaction.editReply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error sending not a TSL Dev response:', error);
            }
            return;
        }

        const listType = interaction.options.getString('list');
        const methodType = interaction.options.getString('method');
        const filePath = listType === 'whitelist' ? whitelistPath : databasePath;

        try {
            const checkCodes = methodType === 'website' ? checkCodesWebsite : checkCodesAPI;
            const { totalChecked, totalRemoved, listName } = await checkCodes(filePath);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`${listName.charAt(0).toUpperCase() + listName.slice(1)} Code Verification Completed`)
                .setDescription(`Total Codes Checked: ${totalChecked}\nTotal Codes Removed: ${totalRemoved}`)
                .setFooter({ text: `Verification done by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            try {
                await interaction.editReply({ embeds: [embed], ephemeral: false });
            } catch (error) {
                console.error('Error sending verification completed response:', error);
            }
        } catch (error) {
            console.error('Error during code verification:', error);
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Error')
                .setDescription('An error has occurred: ' + error.message);

            try {
                await interaction.editReply({ embeds: [embed], ephemeral: true });
            } catch (sendError) {
                console.error('Error sending error response:', sendError);
            }
        }
    }
};
