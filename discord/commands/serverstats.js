const discord = require("discord.js");
const os = require("node:os");

module.exports = {
    /** @param {discord.ChatInputCommandInteraction} interaction */
    permission: (interaction) => true,

    command: new discord.SlashCommandBuilder()
        .setName("serverstats") 
        .setDescription("Show Server Stats.")
        .setDMPermission(true),

    /** @param {discord.ChatInputCommandInteraction} interaction */
    callback: async (interaction) => {
        // cpu usage calc
        const elapTime = process.hrtime();
        const elapUsage = process.cpuUsage();

        const elapTimeMS = secNSec2ms(elapTime);
        const elapUserMS = secNSec2ms(elapUsage.user);
        const elapSystMS = secNSec2ms(elapUsage.system);
        const cpuPercent = Math.round(100 * (elapUserMS + elapSystMS) / elapTimeMS);

        // Getting memory usage
        const usedMemory = process.memoryUsage().heapUsed / 1024 / 1024;

        return interaction.reply({ // Ändere `editReply` zu `reply`
            embeds: [
                new discord.EmbedBuilder()
                    .setTitle("Current Stats")
                    .setColor(0xFF0000)
                    .addFields(
                        {
                            inline: false,
                            name: "CPU",
                            value: `\`\`\`${os.cpus()[0].model} | ${os.cpus()[0].speed} MHz\`\`\``
                        },
                        {
                            inline: false,
                            name: "CPU Usage",
                            value: `\`\`\`${cpuPercent}%\`\`\``,
                            // Farbe basierend auf Nutzung setzen
                            style: cpuPercent < 10 ? discord.Colors.Green : cpuPercent < 50 ? discord.Colors.Yellow : discord.Colors.Red
                        },
                        {
                            inline: false,
                            name: "Memory Usage", 
                            value: `\`\`\`${usedMemory.toFixed(2)} MB\`\`\``
                        },
                        {
                            inline: true,
                            name: "NodeJS Version",
                            value: `\`\`\`${process.version}\`\`\``
                        },
                        {
                            inline: true,
                            name: "DiscordJS Version",
                            value: `\`\`\`v${discord.version}\`\`\``
                        }
                    )
            ],
        });
    },
};

function secNSec2ms(secNSec) {
    if (Array.isArray(secNSec)) {
        return secNSec[0] * 1000 + secNSec[1] / 1000000;
    }
    return secNSec / 1000;
}