const discord = require("discord.js");
const { ButtonBuilder, ActionRowBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    /** @param {discord.ChatInputCommandInteraction} interaction */
    permission: (interaction) => true,

    command: new SlashCommandBuilder()
        .setName("info") 
        .setDescription("Gets Infos about the bot.")
        .setDMPermission(true),

    /** @param {discord.ChatInputCommandInteraction} interaction */
    callback: async (interaction) => {
        const embed = new EmbedBuilder()
            .setTitle("Bot Info")
            .setColor(136)
            .addFields(
                { name: "Creator", value: "[TSL](https://discord.com/users/1150858705823334431)", inline: true },
                { name: "Developers", value: "Justin, Celine", inline: true },
                { name: "Contributors", value: "[trippleawap](https://discord.com/users/869751685017370635), [NoVa Gh0ul](https://discord.com/users/907712767644020787), [dustyfrxg](https://discord.com/users/837826878223548436), [SR Hacker](https://discord.com/users/608791997251321856)", inline: false }
            ) // these Contributors are very cute !
            .setFooter({ text: "TSL NukerV3" })
            .setTimestamp();

        // Button for the support server
        const supportButton = new ButtonBuilder()
            .setLabel("Support Server")
            .setStyle(discord.ButtonStyle.Link)
            .setURL("https://discord.gg/armbe");

        // Action row to hold the button
        const row = new ActionRowBuilder().addComponents(supportButton);

        return interaction.reply({
            embeds: [embed],
            components: [row] // Add the support button to the interaction
        });
    },
};
