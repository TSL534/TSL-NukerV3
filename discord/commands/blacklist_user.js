const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const webhookClient = new WebhookClient({ url: '' });
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';

let adminUsers = new Set();
let blacklistedUsers = new Set();

async function loadAdminAndBlacklist() {
    try {
        const adminData = await fs.readFile(adminFilePath, 'utf-8');
        adminUsers = new Set(JSON.parse(adminData));

        const blacklistData = await fs.readFile(blacklistPath, 'utf-8');
        blacklistedUsers = new Set(JSON.parse(blacklistData));
    } catch (error) {
        console.error('Failed to load admin or blacklist file', error);
    }
}

loadAdminAndBlacklist();

module.exports = {
    command: new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Manage the user blacklist for bot commands.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a user to the blacklist.')
                .addUserOption(option => option.setName('user').setDescription('The user to blacklist').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a user from the blacklist.')
                .addUserOption(option => option.setName('user').setDescription('The user to remove from blacklist').setRequired(true))),

    callback: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const userId = user.id;

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Cope')
                .setDescription(`${errorEmoji} This is a Staff Command ${errorEmoji}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        switch (subcommand) {
            case 'add':
                if (blacklistedUsers.has(userId)) {
                    const embedExists = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Error')
                        .setDescription(`${errorEmoji} ${user.tag} is alrady blacklisted ${errorEmoji}`);
                    await interaction.reply({ embeds: [embedExists], ephemeral: true });
                    return;
                }

                blacklistedUsers.add(userId);
                await updateBlacklistFile();

                const embedAdded = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Success')
                    .setDescription(`${accseptEmoji}${user.tag} has been added to the blacklist ${accseptEmoji}`);
                await interaction.reply({ embeds: [embedAdded], ephemeral: false });

                // Logging to webhook
                const webhookEmbedAdd = new EmbedBuilder()
                    .setTitle('User Blacklisted')
                    .setDescription(`A user has been added to the blacklist.\n\n**User**: ${user.tag} (${user.id})\n**Added by**: ${interaction.user.tag} (${interaction.user.id})\n**Time**: ${new Date().toLocaleString()}`)
                    .setColor(0xFF0000);
                try {
                    await webhookClient.send({ embeds: [webhookEmbedAdd] });
                } catch (error) {
                    console.error('Error sending to webhook:', error);
                }
                break;

            case 'remove':
                if (!blacklistedUsers.has(userId)) {
                    const embedNotExists = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Error')
                        .setDescription(`${errorEmoji} ${user.tag} is not blacklisted ${errorEmoji}`);
                    await interaction.reply({ embeds: [embedNotExists], ephemeral: true });
                    return;
                }

                blacklistedUsers.delete(userId);
                await updateBlacklistFile();

                const embedRemoved = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Success')
                    .setDescription(` ${accseptEmoji} ${user.tag} has been removed from the blacklist ${accseptEmoji}`);
                await interaction.reply({ embeds: [embedRemoved], ephemeral: false });

                // Logging to webhook
                const webhookEmbedRemove = new EmbedBuilder()
                    .setTitle('User Removed from Blacklist')
                    .setDescription(`A user has been removed from the blacklist.\n\n**User**: ${user.tag} (${user.id})\n**Removed by**: ${interaction.user.tag} (${interaction.user.id})\n**Time**: ${new Date().toLocaleString()}`)
                    .setColor(0x00FF00);
                try {
                    await webhookClient.send({ embeds: [webhookEmbedRemove] });
                } catch (error) {
                    console.error('Error sending to webhook:', error);
                }
                break;
        }
    }
};

async function updateBlacklistFile() {
    try {
        await fs.writeFile(blacklistPath, JSON.stringify([...blacklistedUsers]), 'utf-8');
        console.log('Blacklist updated:', [...blacklistedUsers]);
    } catch (error) {
        console.error('Error updating the blacklist file:', error);
    }
}
