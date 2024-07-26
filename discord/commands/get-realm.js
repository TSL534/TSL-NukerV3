const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');

let blacklistedUsers = new Set();
try {
    const blacklistData = fs.readFileSync(blacklistPath, 'utf-8');
    blacklistedUsers = new Set(JSON.parse(blacklistData));
} catch (error) {
    console.error('Error loading blacklist:', error);
}

module.exports = {
    permission: (interaction) => true,

    command: new SlashCommandBuilder()
        .setDescription('Display a random selection of Realm Codes from the database.')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('Number of Realm Codes to display')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(3)), 

    callback: async (interaction) => {
        const requestedCount = interaction.options.getInteger('number');

        if (blacklistedUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Access Denied')
                .setDescription('Womp Womp Pov Blacklisted');
            try {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error sending embed message:', error);
            }
            return;
        }

        try {
            await displayRandomRealmCodes(interaction, requestedCount);
        } catch (error) {
            console.error('Error handling the request:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Error')
                .setDescription('An error occurred.');
            try {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error sending embed message:', error);
            }
        }
    }
};

async function displayRandomRealmCodes(interaction, number) {
    try {
        const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
        const rawData = fs.readFileSync(databasePath, 'utf-8');
        const database = JSON.parse(rawData);

        if (database.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ffcc00')
                .setTitle('No Codes Found Error 404')
                .setDescription('There are no realm codes in the database.');
            try {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error sending embed message:', error);
            }
            return;
        }

        const shuffled = database.sort(() => 0.5 - Math.random());
        const selectedCodes = shuffled.slice(0, 3); // Select exactly 3 random codes

        const codesDisplay = selectedCodes.map(code => 
            `**Name:** ${code.Name}\n**Realm Code:** ${code['Realm Code']}\n**Realm ID:** ${code['Realm ID']}\n**IP:** ${code.IP}\n**Port:** ${code.Port}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Random Realm Codes')
            .setDescription(codesDisplay)
            .setFooter({ text: 'Total Codes Displayed: ' + selectedCodes.length });

        try {
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error('Error sending embed message:', error);
        }
    } catch (error) {
        console.error(error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription('Failed to read the database or process the data.');
        try {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error sending embed message:', error);
        }
    }
}
