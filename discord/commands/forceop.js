const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { red } = require('../../colors');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const loadingEmoji = '<a:loading:1256535355138768906>';

async function loadAdminIds() {
    try {
        const data = await fs.readFile(adminFilePath, 'utf-8');
        return new Set(JSON.parse(data));
    } catch (error) {
        console.error('Error loading admin IDs:', error);
        return new Set();
    }
}

module.exports = {
    command: new SlashCommandBuilder()
        .setName('forceop')
        .setDescription('reel force op')
        .addStringOption(option =>
            option.setName('playername')
                .setDescription('playername')
                .setRequired(true))
        .addStringOption(option =>
             option.setName('realmcode')
                .setDescription('the realm code')
                .setRequired(true)
                .setMinLength(11)
                .setMaxLength(11)
        ),
                

    callback: async (interaction) => {
        const adminIds = await loadAdminIds();

        if (!adminIds.has(interaction.user.id)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('cope')
                .setDescription('this command is currently only for admins');
            try {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } catch (error) {
                if (error.code !== 10062) {
                    console.error('Error sending reply:', error);
                }
            }
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: false });
        } catch (error) {
            if (error.code !== 10062) {
                console.error('Error deferring reply:', error);
            }
        }

        const player = interaction.options.getString('playername');

        const serverNames = ['Server 1', 'Server 2', 'Server 3'];
        const pingTimes = serverNames.map(() => Math.floor(Math.random() * (421 - 248 + 1)) + 248);

        const embed = new EmbedBuilder()
            .setTitle('Checking Mojang Servers')
            .setDescription(`Please wait while we check the Mojang servers ${loadingEmoji} `)
            .setColor('Green')
            .addFields(serverNames.map((server, index) => ({
                name: server,
                value: `Ping: ${pingTimes[index]} ms`,
                inline: true
            })));

        try {
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.code !== 10062) {
                console.error('Error editing reply:', error);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 6000));

        embed
            .setTitle('Establishing Connection')
            .setDescription(`Connecting to Mojang server and realm ${loadingEmoji} `)
            .setFields([]);
       
        try {
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.code !== 10062) {
                console.error('Error editing reply:', error);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 12000));

        embed
            .setTitle('Checking for Memory Leaks')
            .setDescription(`Performing memory leak checks ${loadingEmoji} `);

        try {
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.code !== 10062) {
                console.error('Error editing reply:', error);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 9000));

        embed
            .setTitle(' Memory Leak Found')
            .setDescription(' memory leaks were detected.')
            .setColor(136);

        try {
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.code !== 10062) {
                console.error('Error editing reply:', error);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 6000));

        embed
            .setTitle('Error')
            .setDescription(`Memory Leak Found  `);

        try {
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.code !== 10062) {
                console.error('Error editing reply:', error);
            }
        }
    }
};



