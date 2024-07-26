const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';

let adminUsers = new Set();

async function loadAdminUsers() {
    try {
        const adminData = await fs.readFile(adminFilePath, 'utf-8');
        adminUsers = new Set(JSON.parse(adminData));
    } catch (error) {
        console.error('Failed to load admin file:', error);
    }
}

loadAdminUsers();

module.exports = {
    command: new SlashCommandBuilder()
        .setName('serverlist')
        .setDescription('Show all realms where the bot is present'),

    callback: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Cope')
                .setDescription(`${errorEmoji} This Command is staff only ${errorEmoji}`);
            return interaction.editReply({ embeds: [embed], ephemeral: true });
        }

        const guilds = interaction.client.guilds.cache;
        let embeds = [];
        let currentEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Server List')
            .setDescription('Here are all the servers where the bot is present:')
            .setTimestamp();

        for (const [guildId, guild] of guilds) {
            let serverInfo = `**${guild.name}**\nServer Owner: `;

            try {
                const owner = await guild.fetchOwner();
                serverInfo += `${owner.user.tag}\n`;
            } catch {
                serverInfo += 'Unknown\n';
            }

            serverInfo += `${second}Members: ${guild.memberCount}\n${second}Created on: <t:${parseInt(guild.createdTimestamp / 1000)}:F>\n${second}Server-ID: ${guildId}\n`;

            
            try {
                const invite = await guild.invites.create(guild.systemChannel || guild.channels.cache.find(channel => channel.isText()), { maxAge: 300, maxUses: 1 });
                serverInfo += `${one}Invite: [Click here](${invite.url})\n`;
            } catch (error) {
                console.error(`Failed to create invite for guild ${guildId}: ${error}`);
                serverInfo += 'Invite: Not available\n';
            }

            currentEmbed.addFields({ name: `${guild.name}`, value: serverInfo });

            if (currentEmbed.data.fields.length >= 25) {
                embeds.push(currentEmbed);
                currentEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Server List (continued)')
                    .setDescription('Here are more servers where the bot is present:')
                    .setFooter({ text: 'Requested by ' + interaction.user.tag, iconURL: interaction.user.avatarURL() })
                    .setTimestamp();
            }
        }

        if (currentEmbed.data.fields.length > 0) {
            embeds.push(currentEmbed);
        }

        let page = 0;
        const totalPages = embeds.length;

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

        const embedMessage = await interaction.editReply({ embeds: [embeds[0]], components: [generateActionRow()], ephemeral: true });

        const filter = (i) => i.customId === 'previous' || i.customId === 'next';
        const collector = embedMessage.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
            if (i.customId === 'previous' && page > 0) {
                page--;
            } else if (i.customId === 'next' && page < totalPages - 1) {
                page++;
            }

            await i.update({ embeds: [embeds[page]], components: [generateActionRow()], ephemeral: true });
        });

        collector.on('end', () => {
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
            interaction.editReply({ components: [disabledRow], ephemeral: true });
        });
    }
};
