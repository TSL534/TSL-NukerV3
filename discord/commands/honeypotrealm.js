const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const honeypotFilePath = path.join(__dirname, '..', '..', 'data', 'honeypot.json');
const loggingWebhookUrl = '';
const webhookClient = new WebhookClient({ url: loggingWebhookUrl });
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
        console.error('Failed to load admin file', error);
    }
}

loadAdminUsers();

module.exports = {
    command: new SlashCommandBuilder()
        .setName('honeypot_manage')
        .setDescription("Manage Realm Codes in the honeypot database.")
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a Realm Code to the honeypot database.')
                .addStringOption(option => 
                    option.setName('realmcode')
                        .setDescription('Realm Code to add')
                        .setRequired(true)
                        .setMinLength(11)
                        .setMaxLength(11)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a Realm Code from the honeypot database.')
                .addStringOption(option =>
                    option.setName('realmcode')
                        .setDescription('Realm Code to remove')
                        .setRequired(true)
                        .setMinLength(11)
                        .setMaxLength(11))),

    callback: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const realmCode = interaction.options.getString('realmcode');

        await interaction.deferReply({ ephemeral: false });

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Cope')
                .setDescription(`${errorEmoji} This Command is Staff only ${errorEmoji}`);
            await interaction.editReply({ embeds: [embed], ephemeral: true });
            return;
        }

        switch (subcommand) {
            case 'add':
                await addRealmCode(realmCode, interaction);
                break;
            case 'remove':
                await removeRealmCode(realmCode, interaction);
                break;
        }
    }
};

async function addRealmCode(realmCode, interaction) {
    let honeypot = await readHoneypot();

    if (honeypot.includes(realmCode)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(`${errorEmoji} ${realmCode} is alrady as Honeypot marked ${errorEmoji}`);
        await interaction.editReply({ embeds: [embed], ephemeral: false });
        return;
    }

    try {
        honeypot.push(realmCode);
        await saveHoneypot(honeypot);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Success')
            .setDescription(`${accseptEmoji} ${realmCode} has been added as a Honeypot Realm and cant be joind anymore ${accseptEmoji}`);
        await interaction.editReply({ embeds: [embed], ephemeral: false });

        // Send the realm code to the webhook as an embed
        const webhookEmbed = new EmbedBuilder()
            .setTitle('Honeypot Realm Code Added')
            .addFields(
                { name: 'Realm Code', value: realmCode, inline: false },
                { name: 'Added by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
                { name: 'Time', value: new Date().toLocaleString(), inline: false }
            )
            .setColor('#00ff00');

        await webhookClient.send({ embeds: [webhookEmbed] });
        console.log('Honeypot realm code sent to webhook successfully.');

    } catch (error) {
        console.error('Error adding honeypot realm code:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(`${errorEmoji} Failed to add ${realmCode} to the honeypot database.`);
        await interaction.editReply({ embeds: [embed], ephemeral: false });
    }
}

async function removeRealmCode(realmCode, interaction) {
    let honeypot = await readHoneypot();
    const index = honeypot.indexOf(realmCode);

    if (index === -1) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(`${errorEmoji} ${realmCode} is not a Honeypot ${errorEmoji}`);
        await interaction.editReply({ embeds: [embed], ephemeral: false });
        return;
    }

    honeypot.splice(index, 1);
    await saveHoneypot(honeypot);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Success')
        .setDescription(`${accseptEmoji} ${realmCode} has been removed from the honeypot database and can be joind again.${accseptEmoji}`);
    await interaction.editReply({ embeds: [embed], ephemeral: false });

    // Log removal to the webhook as an embed
    const webhookEmbed = new EmbedBuilder()
        .setTitle('Honeypot Realm Code Removed')
        .addFields(
            { name: 'Realm Code', value: realmCode, inline: false },
            { name: 'Removed by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
            { name: 'Time', value: new Date().toLocaleString(), inline: false }
        )
        .setColor('#ff0000');

    await webhookClient.send({ embeds: [webhookEmbed] });
    console.log('Honeypot realm removal sent to webhook successfully.');
}

async function readHoneypot() {
    try {
        const data = await fs.readFile(honeypotFilePath, 'utf-8');
        return JSON.parse(data.trim());
    } catch (error) {
        console.error('Error reading honeypot file:', error);
        return [];
    }
}

async function saveHoneypot(honeypot) {
    try {
        await fs.writeFile(honeypotFilePath, JSON.stringify(honeypot, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving honeypot file:', error);
    }
}
