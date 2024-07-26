const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');


const REALMS_URL = 'https://open.minecraft.net/pocket/realms/invite/';
const VALID_EMOJI = '<:minecraft_accept:1244399350994698311>';
const INVALID_EMOJI = '<:minecraft_deny:1244399374159577218>';
const COUNT_TO_GENERATE = 20; // max of generating codes (you can set it up higher but bot will take longer)

module.exports = {
    permission: () => true,

    command: new SlashCommandBuilder()
        .setName('genrealmcodes')
        .setDescription("Generate Realm Codes."),

    callback: async (interaction) => {
        await interaction.deferReply({ ephemeral: false });

        try {
            const codes = generateRealmCodes(COUNT_TO_GENERATE);
            const codesWithStatus = await checkCodes(codes);

            const embed = new EmbedBuilder()
                .setTitle('Generated Realm Codes')
                .setColor('#00FF00')
                .setDescription(codesWithStatus.map((item, index) => 
                    `${index + 1}. Code: ${item.code} - Status: ${item.status === 'valid' ? VALID_EMOJI : INVALID_EMOJI}`
                ).join('\n'));

            try {
                await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('Error sending embed message:', err);
            }
        } catch (error) {
            console.error('Error responding to interaction:', error);
            try {
                await interaction.editReply(`An error has occurred: ${error.message}`);
            } catch (err) {
                console.error('Error sending error message:', err);
            }
        }
    }
};

function generateRealmCodes(count) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const codeLength = 11;
    let codes = new Set();

    while (codes.size < count) {
        let code = '';
        for (let i = 0; i < codeLength; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        codes.add(code);
    }

    return Array.from(codes).map(code => ({ code, status: 'valid' }));
}

async function checkCodes(codes) {
    const checkPromises = codes.map(async (item) => {
        const url = `${REALMS_URL}${item.code}`;
        try {
            const r = await fetch(url);
            if (!r.ok) {
                if (r.status === 404) return { code: item.code, status: 'invalid' };
                throw new Error(`Could not connect to ${item.code} - ${r.status} ${r.statusText}`);
            }
            return { code: item.code, status: 'valid' };
        } catch (error) {
            console.error(`Error checking code ${item.code}:`, error);
            return { code: item.code, status: 'invalid' };
        }
    });

    return Promise.all(checkPromises);
}
