const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const loggingWebhookUrl = '';
const webhookClient = new WebhookClient({ url: loggingWebhookUrl });
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const lEmoji = '<a:DyingLaughing:1244399086061355090>';

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
        .setName('database_manage')
        .setDescription("Manage Realm Codes in the database.")
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a Realm Code to the database.')
                .addStringOption(option => 
                    option.setName('realmcode')
                        .setDescription('Realm Code to add')
                        .setRequired(true)
                        .setMinLength(11)
                        .setMaxLength(11)))
        .addSubcommand(subcommand =>
            subcommand.setName('remove')
                .setDescription('Remove a Realm Code from the database.')
                .addStringOption(option =>
                    option.setName('realmcode')
                        .setDescription('Realm Code to remove')
                        .setRequired(true)
                        .setMinLength(11)
                        .setMaxLength(11))),

    callback: async (interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const realmCode = interaction.options.getString('realmcode');

        await interaction.deferReply({ ephemeral: true });

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Cope')
                .setDescription(`${errorEmoji} This is a Staff Command ${errorEmoji}`);
            try {
                await interaction.editReply({ embeds: [embed], ephemeral: false });
            } catch (error) {
                console.error('Error sending access denied message:', error);
            }
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
    let database = await readDatabase();

    if (database.some(entry => entry['Realm Code'] === realmCode)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(`${errorEmoji} ${realmCode} is alrady in the Database ${errorEmoji}`);
        try {
            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error sending duplicate code message:', error);
        }
        return;
    }

    try {
        const [codeStatus] = await checkCodes([realmCode]);
        if (codeStatus.status === 'invalid') {
            try {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('Error').setDescription(`${errorEmoji} ${realmCode} is unvaild ${errorEmoji} `)], ephemeral: true });
            } catch (error) {
                console.error('Error sending invalid code message:', error);
            }
            return;
        }

        if (codeStatus.status === 'error') {
            try {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#ff0000').setTitle('Error').setDescription(`Error: ${codeStatus.error}`)], ephemeral: true });
            } catch (error) {
                console.error('Error sending code status error message:', error);
            }
            return;
        }

        const newEntry = {
            "Name": codeStatus.realmName,
            "Realm Code": realmCode,
            "Realm ID": codeStatus.realmId,
            "IP": codeStatus.host,
            "Port": codeStatus.port
        };

        database.push(newEntry);
        await saveDatabase(database);

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Success')
            .setDescription(`${accseptEmoji} ${realmCode} has been added to the database ${accseptEmoji}`);
        try {
            await interaction.editReply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error('Error sending success message:', error);
        }

        // Send the realm code to the webhook as an embed
        const webhookEmbed = new EmbedBuilder()
            .setTitle('Realm Code Added')
            .addFields(
                { name: 'Realm Code', value: realmCode, inline: false },
                { name: 'Name', value: codeStatus.realmName, inline: false },
                { name: 'ID', value: codeStatus.realmId.toString(), inline: false },
                { name: 'Host', value: codeStatus.host, inline: true },
                { name: 'Port', value: codeStatus.port.toString(), inline: true },
                { name: 'Added by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
                { name: 'Time', value: new Date().toLocaleString(), inline: false }
            )
            .setColor('#00ff00');

        try {
            await webhookClient.send({ embeds: [webhookEmbed] });
            console.log('Realm code sent to webhook successfully.');
        } catch (error) {
            console.error('Error sending realm code to webhook:', error);
        }

    } catch (error) {
        console.error('Error adding realm code:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(`${errorEmoji} Faild to add Code to the Database ${errorEmoji}`);
        try {
            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (err) {
            console.error('Error sending database error message:', err);
        }
    }
}

async function removeRealmCode(realmCode, interaction) {
    let database = await readDatabase();
    const index = database.findIndex(entry => entry['Realm Code'] === realmCode);

    if (index === -1) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(`${errorEmoji} ${realmCode} is not in the Database ${errorEmoji}`);
        try {
            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error sending code not found message:', error);
        }
        return;
    }

    const removedEntry = database.splice(index, 1)[0];
    await saveDatabase(database);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Success')
        .setDescription(`${accseptEmoji} Realm Code ${realmCode} has been removed from the database ${accseptEmoji}`);
    try {
        await interaction.editReply({ embeds: [embed], ephemeral: false });
    } catch (error) {
        console.error('Error sending success message:', error);
    }

    const webhookEmbed = new EmbedBuilder()
        .setTitle('Realm Code Removed')
        .addFields(
            { name: 'Realm Code', value: realmCode, inline: false },
            { name: 'Name', value: removedEntry.Name, inline: false },
            { name: 'ID', value: removedEntry["Realm ID"].toString(), inline: false },
            { name: 'Host', value: removedEntry.IP, inline: true },
            { name: 'Port', value: removedEntry.Port.toString(), inline: true },
            { name: 'Removed by', value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
            { name: 'Time', value: new Date().toLocaleString(), inline: false }
        )
        .setColor('#ff0000');

    try {
        await webhookClient.send({ embeds: [webhookEmbed] });
        console.log('Realm removal sent to webhook successfully.');
    } catch (error) {
        console.error('Error sending removal to webhook:', error);
    }
}

async function readDatabase() {
    try {
        const data = await fs.readFile(databasePath, 'utf-8');
        return JSON.parse(data.trim());
    } catch (error) {
        console.error('Error reading database file:', error);
        return [];
    }
}

async function saveDatabase(database) {
    try {
        await fs.writeFile(databasePath, JSON.stringify(database, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving database file:', error);
    }
}

const checkCodes = async (codes) => {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000441cc96b',
        flow: 'live'
    };

    const userIdentifier = 'unique_identifier'; // im still hungry
    const authFlow = new Authflow(userIdentifier, profilesFolder, options);
    const api = RealmAPI.from(authFlow, 'bedrock');

    const checkPromises = codes.map(async (code) => {
        try {
            const realm = await api.getRealmFromInvite(code);
            if (!realm) {
                return { code, status: 'invalid' };
            }

            // console.log('Realm data:', realm); // Debugging line to log the realm object

            const address = await realm.getAddress();
            return {
                code,
                status: 'valid',
                realmName: realm.name,
                realmId: realm.id,
                host: address.host,
                port: address.port
            };
        } catch (error) {
            console.error('Error fetching realm data:', error);
            return { code, status: 'error', error: error.message };
        }
    });

    try {
        return await Promise.all(checkPromises);
    } catch (error) {
        console.error('Error fetching data:', error);
        return [{ code: 'unknown', status: 'error', error: error.message }];
    }
};
