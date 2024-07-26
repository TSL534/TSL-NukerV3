const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const { red } = require('../../colors');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const webhookUrl = '';
const webhookClient = new WebhookClient({ url: webhookUrl });
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';

let adminUsers = new Set();

const loadAdmins = () => {
    try {
        const adminData = fs.readFileSync(adminFilePath, 'utf-8');
        adminUsers = new Set(JSON.parse(adminData));
    } catch (error) {
        console.error('Failed to load admin file', error);
    }
};

const saveAdmins = (admins) => {
    try {
        fs.writeFileSync(adminFilePath, JSON.stringify([...admins], null, 4), 'utf8');
    } catch (error) {
        console.error('Error saving admin file', error);
    }
};

module.exports = {
    command: new SlashCommandBuilder()
        .setName('admin_user')
        .setDescription('Add or Remove players from the Admin List')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a user to the Admin List.')
                .addUserOption(option => option.setName('user').setDescription('The user you want to make an Admin').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a user from the Admin List.')
                .addUserOption(option => option.setName('user').setDescription('The user you want to remove from Admin').setRequired(true))),

    callback: async (interaction) => {
        loadAdmins(); // Ensure the admin list is up to date

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
                if (adminUsers.has(userId)) {
                    const embedExists = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('Error')
                        .setDescription(` ${errorEmoji} ${user.tag} is already an Admin ${errorEmoji}`);
                    await interaction.reply({ embeds: [embedExists], ephemeral: true });
                    return;
                }

                adminUsers.add(userId);
                saveAdmins(adminUsers);

                const embedAdded = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Added')
                    .setDescription(`${user.tag} is an Admin Now ${accseptEmoji}.`);
                await interaction.reply({ embeds: [embedAdded], ephemeral: false });

                // Logging to webhook
                const webhookEmbedAdd = new EmbedBuilder()
                    .setTitle('Admin Added')
                    .setDescription(`New admin got added \n\n**New User**: ${user.tag} (${user.id})\n**Added by**: ${interaction.user.tag} (${interaction.user.id})\n**Time**: ${new Date().toLocaleString()}`)
                    .setColor(0x00FF00);
                try {
                    await webhookClient.send({ embeds: [webhookEmbedAdd] });
                } catch (error) {
                    console.error('Error sending to webhook:', error);
                }
                break;

            case 'remove':
                if (!adminUsers.has(userId)) {
                    const embedNotExists = new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('Error')
                        .setDescription(`${errorEmoji} ${user.tag} is not an Admin ${errorEmoji}`);
                    await interaction.reply({ embeds: [embedNotExists], ephemeral: true });
                    return;
                }

                adminUsers.delete(userId);
                saveAdmins(adminUsers);

                const embedRemoved = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Success')
                    .setDescription(` ${accseptEmoji} ${user.tag} is not an Admin anymore ${accseptEmoji}.`);
                await interaction.reply({ embeds: [embedRemoved], ephemeral: false });

                // Logging to webhook
                const webhookEmbedRemove = new EmbedBuilder()
                    .setTitle('Admin Removed')
                    .setDescription(`An admin has been removed.\n\n**Old Admin**: ${user.tag} (${user.id})\n**Removed by**: ${interaction.user.tag} (${interaction.user.id})\n**Time**: ${new Date().toLocaleString()}`)
                    .setColor(0xFF0000);
                try {
                    await webhookClient.send({ embeds: [webhookEmbedRemove] });
                } catch (error) {
                    console.error('Error sending to webhook:', error);
                }
                break;
        }
    }
};
