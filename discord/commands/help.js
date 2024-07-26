const discord = require("discord.js");
const admin = "<:Staff:1257823846002724995>";
const booster ="<a:Boosters:1244399128536944741>";
const free = "<:redheart:1253356372230148117>";

module.exports = {
    /** @param {discord.ChatInputCommandInteraction} interaction */
    permission: (interaction) => true,

    command: new discord.SlashCommandBuilder()
        .setDescription("Gets Infos about the bot.")
        .setDMPermission(true),

    /** @param {discord.ChatInputCommandInteraction} interaction */
    callback: async (interaction) => {
        const embed = new discord.EmbedBuilder()
            .setTitle("Bot Info")
            .setColor(136)  // blue
            .addFields(
                { name: `${admin} Staff Commands ${admin}`, value: "----------------", inline: false },
                { name: "admin user", value: "Add/Remove ppl admin perms to the Bot", inline: false },
                { name: "blacklist user", value: "Blacklist users from using the Bot", inline: false },
                { name: "database", value: "Add/Remove Realms From the Database", inline: false },
                { name: "whitelist", value: "Add/Remove Realms from the Whitelist ", inline: false },
                { name: "Force Op", value: "Get yourself or someone else op Permission", inline: false },
                { name: "Honeypot Realm", value: "Add/Remove Realms from the Honeypot list", inline: false },
                { name: "Leave Guild", value: "Leaves a discord Server whit the Id", inline: false },
                { name: "Leave Realm", value: "Remove a Realm from the Realm list", inline: false },
                { name: "-----------", value: "----------------------------------------------------", inline: false },
                { name: `${booster} Premium ${booster}`, value: "-----COMMING SOON-----", inline: false },
                { name: `${free} Free Commands ${free}`, value: "-------------------------------", inline: false },
                { name: "Spam", value: "Spam a Realm Whit many Modies and Funktions", inline: false },
                { name: "Nuke", value: "Spam a Realm Whit 4 costume wisper/messages and freez the Realm (update soon) ", inline: false },
                { name: "Id Spam", value: "Spam a Realm by using the Realm Id", inline: false },
                { name: "User Spam", value: "Select a taget you want so Spam (specific User soon)", inline: false },
                { name: "Freez Realm", value: "Freez Realm using the new Exploit", inline: false },
                { name: "Playerlist", value: "Shows how many and what player are on the Server (currently using bp)", inline: false },
                { name: "Server List", value: "Shows every Guild where the Bot is in", inline: false },
                { name: "Seed", value: "Get the Realm Seed", inline: false },
                { name: "Spawn Coords", value: "Get the spawn coord from a Realm", inline: false },
                { name: "Realm Dump", value: "Get Infos about the Realm using Realm Code/Realm ID", inline: false },
                { name: "Find Realm", value: "Find the Realm Code/ID in the database or Realm list", inline: false },
                { name: "Get Realm", value: "Get  1-3 Randome Realms from the Database", inline: false },
                { name: "Get Ip", value: "Get the Ip and port from a Realm", inline: false },
            )
            .setFooter({ text: "Bot made by TSL" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};