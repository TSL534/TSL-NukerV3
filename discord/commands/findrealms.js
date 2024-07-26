const { SlashCommandBuilder, EmbedBuilder, WebhookClient, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');

const blacklistPath = path.join(__dirname, '..', '..', 'data', 'blacklist.json');
const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const userIdentifier = 'unique_identifier';
const lEmoji = '<a:DyingLaughing:1244399086061355090>';
const accseptEmoji = '<a:Check:1256612972793565204>';
const errorEmoji = '<:deny:1256622572762562681>';
const one = '<:lll:1258031168281116794>';
const second = '<:down:1258031126472036433>';

const webhookClient = new WebhookClient({ url: '' });

let blacklistedUsers = new Set();

async function loadBlacklist() {
    try {
        const blacklistData = await fs.readFile(blacklistPath, 'utf-8');
        blacklistedUsers = new Set(JSON.parse(blacklistData));
    } catch (error) {
        console.error('Fehler beim Laden der Blacklist:', error);
    }
}

loadBlacklist();

const listRealms = async (authFlow) => {
    const api = RealmAPI.from(authFlow, 'bedrock');
    try {
        return await api.getRealms();
    } catch (error) {
        throw new Error('Could not retrieve realms list');
    }
};

module.exports = {
    command: new SlashCommandBuilder()
        .setName('findrealm')
        .setDescription("Find a Realm by name in the database or realm list.")
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name associated with the Realm Code')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Choose the source to search: database, realmlist, or both.')
                .setRequired(true)
                .addChoices(
                    { name: 'Database', value: 'database' },
                    { name: 'Realm List', value: 'realmlist' },
                    { name: 'Both', value: 'both' }
                )),

    callback: async (interaction) => {
        const name = interaction.options.getString('name').trim().toLowerCase();
        const source = interaction.options.getString('source');

        await interaction.deferReply({ ephemeral: false });

        const logEmbed = new EmbedBuilder()
            .setTitle('Findrealm Command Executed')
            .setColor('#00ff00')
            .addFields(
                { name: 'User', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Name', value: name, inline: true },
                { name: 'Source', value: source, inline: true },
                { name: 'Time', value: new Date().toLocaleString(), inline: true }
            );

        if (blacklistedUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('Womp Womp')
                .setDescription(`${lEmoji} You are Blacklisted ${lEmoji}`);
            try {
                await interaction.editReply({ embeds: [embed], ephemeral: false });
            } catch (error) {
                console.error('Error sending blacklist message:', error);
            }

            logEmbed.setColor('#ff0000').setDescription('User is blacklisted.');
            try {
                await webhookClient.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error('Error sending webhook log:', error);
            }
            return;
        }

        const searchResults = [];

        if (source === 'database' || source === 'both') {
            try {
                const rawData = await fs.readFile(databasePath, 'utf-8');
                const database = JSON.parse(rawData);

                const foundItems = database.filter(item => item.Name && item.Name.toLowerCase().includes(name));
                if (foundItems.length > 0) {
                    searchResults.push(...foundItems.map(item => ({
                        Name: item.Name,
                        'Realm Code': item['Realm Code'],
                        'Realm ID': item['Realm ID'],
                        IP: item['IP'],
                        Port: item.Port,
                        Source: 'Database'
                    })));
                }
            } catch (error) {
                console.error('Fehler beim Lesen der Datenbank:', error);
            }
        }

        if (source === 'realmlist' || source === 'both') {
            try {
                const authFlow = new Authflow(userIdentifier, './');
                const realmsList = await listRealms(authFlow);
                const filteredRealms = realmsList.filter(realm => realm.name.toLowerCase().includes(name.toLowerCase()));

                const databaseData = await fs.readFile(databasePath, 'utf-8');
                const database = JSON.parse(databaseData);

                if (filteredRealms.length > 0) {
                    searchResults.push(...filteredRealms.map(realm => {
                        const dbEntry = database.find(item => item['Realm ID'] === realm.id);
                        return {
                            Name: realm.name,
                            'Realm Code': dbEntry ? dbEntry['Realm Code'] : 'N/A',
                            'Realm ID': realm.id,
                            IP: realm.host,
                            Port: realm.port,
                            Source: 'Realm List'
                        };
                    }));
                }
            } catch (error) {
                console.error('Fehler beim Abrufen der Realmliste:', error);
            }
        }

        if (searchResults.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ffcc00')
                .setTitle('No Results Found')
                .setDescription(` ${errorEmoji} No realm codes found containing '${name}' in the ${source} ${errorEmoji}`);
            try {
                await interaction.editReply({ embeds: [embed], ephemeral: true });
            } catch (error) {
                console.error('Error sending no results message:', error);
            }
        } else {
            const pageSize = 3;
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * pageSize;
                const end = start + pageSize;
                const pageResults = searchResults.slice(start, end);

               

                const formattedResults = pageResults.map((item, index) => ({
                    name: `${start + index + 1}. Name: ${item.Name}`,
                    value: `${item.Source === 'Database' ? (item['Realm Code'] !== 'N/A' ? accseptEmoji : errorEmoji) : ''} ${second} **Realm Code**: ${item['Realm Code']}\n ${second}**Realm ID**: ${item['Realm ID']}\n ${second} **IP**: ${item.IP}\n ${second}**Port**: ${item.Port}\n${one}**Source**: ${item.Source}`,
                    inline: false
                }));

                return new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`Realm Search Results (Page ${page + 1}/${Math.ceil(searchResults.length / pageSize)})`)
                    .addFields(formattedResults)
                    .setFooter({ text: `Number of search results found: ${searchResults.length}` });
            };

            const embedMessage = await interaction.editReply({
                embeds: [generateEmbed(currentPage)],
                components: [new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(currentPage === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(searchResults.length <= pageSize)
                )]
            });

            const collector = embedMessage.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'previous') {
                    currentPage--;
                } else if (i.customId === 'next') {
                    currentPage++;
                }

                try {
                    await i.update({
                        embeds: [generateEmbed(currentPage)],
                        components: [new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('previous')
                                .setLabel('Previous')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('Next')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(currentPage === Math.ceil(searchResults.length / pageSize) - 1)
                        )]
                    });
                } catch (error) {
                    console.error('Error updating embed message:', error);
                }
            });

            collector.on('end', async () => {
                try {
                    await embedMessage.edit({ components: [] });
                } catch (error) {
                    console.error('Error clearing buttons after collector end:', error);
                }
            });
        }

        logEmbed.addFields(
            { name: 'Number of Results', value: searchResults.length.toString(), inline: true }
        );
        try {
            await webhookClient.send({ embeds: [logEmbed] });
        } catch (error) {
            console.error('Error sending log to webhook:', error);
        }
    }
};
