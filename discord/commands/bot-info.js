const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');
const { red } = require('../../colors');

const databasePath = path.join(__dirname, '..', '..', 'data', 'database.json');
const whitelistPath = path.join(__dirname, '..', '..', 'data', 'whitelist.json');
const packagePath = path.join(__dirname, '..', '..', 'package.json'); 

const accountnames = ['FaintScarf13276'];

module.exports = {
    command: new SlashCommandBuilder()
        .setDescription('Displays information about the bot'),

    callback: async (interaction) => {
        await interaction.deferReply();

        // Get bot uptime
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor(uptime / 3600) % 24;
        const minutes = Math.floor(uptime / 60) % 60;
        const seconds = Math.floor(uptime % 60);

        const guildCount = interaction.client.guilds.cache.size;

        // Get total members across all guilds
        const totalMembers = interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        // Read and parse JSON files
        let database, whitelist, packageData;
        try {
            database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
            whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf8'));
            packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        } catch (error) {
            console.error('Error loading JSON files:', error);
            await interaction.editReply('Error loading data files.');
            return;
        }

        // Get counts
        const databaseCount = database.length;
        const whitelistCount = whitelist.length;

        // Get realm list count
        let realmListCount = 0;
        try {
            const userIdentifier = 'unique_identifier';
            const cacheDir = './';
            const authFlow = new Authflow(userIdentifier, cacheDir);
            const realmsList = await listRealms(authFlow);
            realmListCount = realmsList.length;
        } catch (error) {
            console.error('Error retrieving realms list:', error);
            await interaction.editReply('Error retrieving realms list.');
            return;
        }

        // Get memory usage
        const memoryUsage = process.memoryUsage();
        const memoryUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const memoryTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);

        // Get CPU usage
        const cpuUsage = process.cpuUsage();
        const cpuUser = (cpuUsage.user / 1000000).toFixed(2);
        const cpuSystem = (cpuUsage.system / 1000000).toFixed(2);

        // Get bot version
        const botVersion = packageData.version;

        // Get Node.js version
        const nodeVersion = process.version;

        // Get ping
        const ping = Math.round(interaction.client.ws.ping);

        // Get bot's username and ID
        const botUsername = interaction.client.user.username;
        const botId = interaction.client.user.id;

        // Get number of shards
        const shardCount = interaction.client.shard ? interaction.client.shard.count : 1;

        // Get current shard number
        const currentShard = (interaction.member?.guild.shard.id ?? 0) + 1;

        // Create the embed
        const embed = new EmbedBuilder()
            .setColor(136)
            .setTitle('Bot Information')
            .addFields(
                { name: 'Uptime', value: `${days}d ${hours}h ${minutes}m ${seconds}s`, inline: false },
                { name: 'Guild Count', value: `${guildCount}`, inline: false },
                { name: 'Total Members used Bot', value: `${totalMembers}`, inline: false },
                { name: 'Database Count', value: `${databaseCount}`, inline: false },
                { name: 'Whitelist Count', value: `${whitelistCount}`, inline: false },
                { name: 'Realm List Count', value: `${realmListCount}`, inline: false },
                { name: 'Memory Usage', value: `${memoryUsed} MB / ${memoryTotal} MB`, inline: false },
                { name: 'CPU Usage', value: `User: ${cpuUser}%, System: ${cpuSystem}%`, inline: false },
                { name: 'Bot Version', value: `${botVersion}`, inline: false },
                { name: 'Node.js Version', value: `${nodeVersion}`, inline: false },
                { name: 'Ping', value: `${ping} ms`, inline: false },
                { name: 'BP Version', value: `1.21.0`, inline: false },
                { name: 'Shard Count', value: `${shardCount}`, inline: false },
                { name: 'Current Shard', value: `${currentShard}`, inline: false }
            )
            .setFooter({ text: 'Bot Information', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        // Send the embed
        await interaction.editReply({ embeds: [embed] });
    }
};

async function listRealms(authFlow) {
    const profilesFolder = './';
    const options = {
        authTitle: '00000000441cc96b',
        flow: 'live'
    };

    const authflow = new Authflow(accountnames[0], profilesFolder, options);
    const api = RealmAPI.from(authflow, 'bedrock');

    let realmsList;
    try {
        realmsList = await api.getRealms();
    } catch (error) {
        throw new Error(`${consol.red}[Discord Error] ${consol.white} Could not retrieve realms list`);
    }

    return realmsList;
}
