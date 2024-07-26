const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Authflow } = require('prismarine-auth');
const { RealmAPI } = require('prismarine-realms');

const accountnames = ['FaintScarf13276']; // do NOT Change

module.exports = {
    command: new SlashCommandBuilder()
        .setName('realminvites')
        .setDescription('Show all realm invitations and provide a button to accept all.'),

    callback: async (interaction) => {
        try {
            await interaction.deferReply();

            const userIdentifier = 'unique_identifier';
            const cacheDir = './';
            const authFlow = new Authflow(userIdentifier, cacheDir);
            const api = RealmAPI.from(authFlow, 'bedrock');

            // Fetch all realm invitations
            let invites;
            try {
                invites = await api.getPendingInvites();
            } catch (error) {
                console.error('Error fetching realm invitations:', error); // Debugging information
                throw new Error('Could not fetch realm invitations.');
            }

            if (!invites || invites.length === 0) {
                await interaction.editReply({
                    embeds: [
                        {
                            description: 'You dont have a Realm Invite open.',
                            color: 16724787
                        }
                    ],
                    ephemeral: true
                });
                return;
            }

            let description = invites.map((invite, index) => {
                return `**Realm Name**: ${invite.realmName}\n**Owner**: ${invite.ownerName}\n**Realm ID**: ${invite.realmId}\n\n`;
            }).join('');

            const embed = new EmbedBuilder()
                .setTitle('Your Realm Invitations')
                .setDescription(description)
                .setColor(1286414);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('accept_all')
                        .setLabel('Accept All')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });

            const filter = i => i.customId === 'accept_all' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });

            collector.on('collect', async i => {
                if (i.customId === 'accept_all') {
                    try {
                        await Promise.all(invites.map(invite => api.acceptRealmInvitation(invite.invitationId)));
                        await i.update({ content: 'All invitations accepted!', components: [] });
                    } catch (error) {
                        console.error('Error accepting all invitations:', error); // Debugging information
                        await i.update({ content: 'Failed to accept all invitations.', components: [] });
                    }
                }
            });
        } catch (e) {
            console.error('Error executing command:', e); // Debugging information
            const errorEmbed = new EmbedBuilder()
                .setDescription(`error: ${e.message || e}`)
                .setColor(16724787);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

async function getUsernameFromUUID(uuid) {
    try {
        const response = await fetch(`https://api.mojang.com/user/profiles/${uuid}/names`);
        if (!response.ok) {
            console.log(`Error fetching username: ${response.statusText}`);
            return 'N/A';
        }
        const data = await response.json();
        return data[0].name; // Return the latest known name
    } catch (error) {
        console.error('Error fetching username from UUID:', error);
        return 'N/A';
    }
}
