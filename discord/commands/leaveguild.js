const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:reply:1258168210486726726>';
const second = '<:replycountinue:1258168190861709484>';

module.exports = {
    command: new SlashCommandBuilder()
        .setName('leaveguild')
        .setDescription('Make the Bot leave a Guild.')
        .addStringOption(option =>
            option.setName('server_id')
                .setDescription('The Server ID')
                .setRequired(true)),

    callback: async (interaction) => {
        const admins = loadAdmins();

        // check if user is in the admin.json file
        if (!admins.includes(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Cope')
                .setDescription(`${errorEmoji} This Command is Staff only ${errorEmoji}`);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const serverId = interaction.options.getString('server_id');
        const guild = interaction.client.guilds.cache.get(serverId);
        if (!guild) {
            return interaction.reply({ content: " I can't find a server with this ID or Bot is not on this server.", ephemeral: false });
        }

        try {
            await guild.leave();
            await interaction.reply({ content: `Left Guild: ${guild.name}.` });
        } catch (error) {
            console.error('Error leaving the server', error);
            await interaction.reply({ content: "There was a problem leaving the server.", ephemeral: false });
        }
    }
};

// Function to load admin IDs from admin.json
function loadAdmins() {
    try {
        const data = fs.readFileSync(adminFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading admin.json', error);
        return [];
    }
}
