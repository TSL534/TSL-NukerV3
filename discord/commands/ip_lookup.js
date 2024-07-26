const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
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
        .setName('ip_lookup')
        .setDescription('Performs an IP lookup and shows information about the IP address.')
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('The IP address to lookup.')
                .setRequired(true)),

    callback: async (interaction) => {
        loadAdmins(); // Ensure the admin list is up to date

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Permission Denied')
                .setDescription('This is a Staff Command.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const ip = interaction.options.getString('ip');

        const lookupEmbed = new EmbedBuilder()
            .setTitle('IP Lookup')
            .setColor(0x00FF00)
            .setDescription(`Looking up information for IP address: ${ip}.`);

        await interaction.reply({ embeds: [lookupEmbed], ephemeral: false });

        try {
            const response = await axios.get(`http://ip-api.com/json/${ip}`); //getting a proxy ip 
            const data = response.data;

            if (data.status !== 'success') {
                throw new Error(data.message || 'Failed to fetch IP information');
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle('IP Information')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'IP', value: data.query, inline: true },
                    { name: 'Country', value: data.country, inline: true },
                    { name: 'Region', value: data.regionName, inline: true },
                    { name: 'City', value: data.city, inline: true },
                    { name: 'ISP', value: data.isp, inline: true },
                    { name: 'Org', value: data.org, inline: true },
                    { name: 'AS', value: data.as, inline: true },
                    { name: 'Latitude', value: data.lat.toString(), inline: true },
                    { name: 'Longitude', value: data.lon.toString(), inline: true },
                    { name: 'Timezone', value: data.timezone, inline: true }
                )
                .setFooter({ text: 'IP Lookup Service' })
                .setTimestamp();

            interaction.followUp({ embeds: [resultEmbed], ephemeral: false });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setColor(0xFF0000)
                .setDescription(`Failed to fetch information for IP address ${ip}.\n\`\`\`${error.message}\`\`\``);
            interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            console.error(`Error fetching IP information: ${error.message}`);
        }
    }
};
