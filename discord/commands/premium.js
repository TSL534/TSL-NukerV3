const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, WebhookClient } = require('discord.js');

const premiumPath = path.join(__dirname, '..', '..', 'data', 'premium.json');
const webhookLoggingClient = new WebhookClient({ url: '' });
const errorEmojie = "<:deny:1256622572762562681>";
const workedEmojie = "<a:Check:1256612972793565204>";

let premiumUsers = new Set();

async function loadPremiumUsers() {
    try {
        const premiumData = await fs.promises.readFile(premiumPath, 'utf-8');
        premiumUsers = new Set(JSON.parse(premiumData));
    } catch (error) {
        console.error('Error loading premium users:', error);
    }
}

loadPremiumUsers();

module.exports = {
    command: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Manage premium users')
        .addSubcommand(subcommand =>
            subcommand.setName('adduser')
                .setDescription('Add a user to the premium list')
                .addStringOption(option =>
                    option.setName('user_id')
                        .setDescription('The ID of the user to add')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand.setName('removeuser')
                .setDescription('Remove a user from the premium list')
                .addStringOption(option =>
                    option.setName('user_id')
                        .setDescription('The ID of the user to remove')
                        .setRequired(true)
                )
        ),

    callback: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.options.getString('user_id');
        const userTag = interaction.user.tag;

        try {
            await interaction.deferReply({ ephemeral: true });

            if (subcommand === 'add_user') {
                if (premiumUsers.has(userId)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Error')
                        .setDescription(`${errorEmojie} User is already in the premium list ${errorEmojie}`);
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    premiumUsers.add(userId);
                    await fs.promises.writeFile(premiumPath, JSON.stringify([...premiumUsers], null, 2));
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('Success')
                        .setDescription(`${workedEmojie} ${userTag} added to the premium list ${workedEmojie}`);
                    await interaction.editReply({ embeds: [successEmbed] });

                    const webhookEmbed = new EmbedBuilder()
                        .setTitle('User Added to Premium List')
                        .setDescription(`User \`${userTag}\` added \`${userId}\` to the premium list.`)
                        .setColor('#00ff00')
                        .setTimestamp();
                    await webhookLoggingClient.send({ embeds: [webhookEmbed] });
                }
            } else if (subcommand === 'remove_user') {
                if (!premiumUsers.has(userId)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('Error')
                        .setDescription(`${errorEmojie} User is not in the premium list ${errorEmojie}`);
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    premiumUsers.delete(userId);
                    await fs.promises.writeFile(premiumPath, JSON.stringify([...premiumUsers], null, 2));
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('Success')
                        .setDescription(`${workedEmojie} User removed from the premium list ${workedEmojie}`);
                    await interaction.editReply({ embeds: [successEmbed] });

                    const webhookEmbed = new EmbedBuilder()
                        .setTitle('User Removed from Premium List')
                        .setDescription(`User \`${userTag}\` removed \`${userId}\` from the premium list.`)
                        .setColor('#ff0000')
                        .setTimestamp();
                    await webhookLoggingClient.send({ embeds: [webhookEmbed] });
                }
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Unexpected Error')
                .setDescription('An unexpected error occurred.')
                .addFields({ name: 'Error', value: error.message, inline: false });
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
