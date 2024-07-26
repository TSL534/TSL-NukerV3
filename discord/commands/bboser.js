const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const net = require('net');

const adminFilePath = path.join(__dirname, '..', '..', 'data', 'admin.json');
let adminUsers = new Set();

const loadAdmins = () => {
    try {
        const adminData = fs.readFileSync(adminFilePath, 'utf-8');
        adminUsers = new Set(JSON.parse(adminData));
    } catch (error) {
        console.error('Failed to load admin file', error);
    }
};

const saveAdmins = (admins) => {
    try {
        fs.writeFileSync(adminFilePath, JSON.stringify([...admins], null, 4), 'utf8');
    } catch (error) {
        console.error('Error saving admin file', error);
    }
};

module.exports = {
    command: new SlashCommandBuilder()
        .setName('send_packets')
        .setDescription('Sends a specified number of packets to a specified IP address.')
        .addStringOption(option =>
            option.setName('ip')
                .setDescription('The IP address to send data to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('The port to send data to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('The number of packets to send.')
                .setRequired(true)),

    callback: async (interaction) => {
        loadAdmins(); // Ensure the admin list is up to date

        if (!adminUsers.has(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Permission Denied')
                .setDescription('This is a Staff Command.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const ip = interaction.options.getString('ip');
        const port = interaction.options.getInteger('port') || 80; // Default to 80 if not provided
        const count = interaction.options.getInteger('count'); // Number of packets to send
        const packetSize = 1024; // Size of each packet in bytes (1 KB)
        let packetsSent = 0;
        let totalBytesSent = 0;

        const embed = new EmbedBuilder()
            .setTitle('Sending Data')
            .setColor(0x00FF00)
            .setDescription(`Sending ${count} packets of ${packetSize} bytes each to ${ip} on port ${port}.`);

        await interaction.reply({ embeds: [embed], ephemeral: false });

        const sendPacket = () => {
            if (packetsSent >= count) {
                console.log(`All ${count} packets sent to ${ip} on port ${port}.`);
                const resultEmbed = new EmbedBuilder()
                    .setTitle('Data Sent')
                    .setColor(0x00FF00)
                    .setDescription(`Successfully sent ${count} packets of ${packetSize} bytes each to ${ip} on port ${port}. Total data sent: ${(totalBytesSent / (1024 * 1024)).toFixed(2)} MB.`);
                interaction.followUp({ embeds: [resultEmbed], ephemeral: false });
                return;
            }

            const client = new net.Socket();
            client.connect(port, ip, () => {
                packetsSent++;
                const data = Buffer.alloc(packetSize, `Packet ${packetsSent}`);
                totalBytesSent += data.length;
                client.write(data);
                client.destroy(); // Close the connection after sending the packet
            });

            client.on('error', (err) => {
                console.error(`Error sending packet ${packetsSent}:`, err.message);
            });

            client.on('close', () => {
                console.log(`Packet ${packetsSent} sent to ${ip} on port ${port}. Total data sent: ${(totalBytesSent / (1024)).toFixed(2)} KB.`);
                sendPacket(); // Send the next packet
            });
        };

        sendPacket();
    }
};
