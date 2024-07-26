const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { SlashCommandBuilder } = require('discord.js');

const dataPath = path.join(__dirname, '..', '..', 'data', 'pmcscraper.json');

// Ensure the directory exists
fs.mkdirSync(path.dirname(dataPath), { recursive: true });

async function scrapePage() {
    const page = "https://www.planetminecraft.com/forums/minecraft/servers/joinable-minecraft-realm-with-co-559977/";
    let allPosts = {};
    try {
        allPosts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (err) {
        // If the file doesn't exist or is invalid, we start with an empty object
        console.log("Starting with an empty data object.");
    }

    const dom = await JSDOM.fromURL(page);
    const doc = dom.window.document;

    const xpath = `/html/body/div[4]/div/div[2]/div[7]/*/div[1]/div[2]`;
    const evaluator = new dom.window.XPathEvaluator();
    const result = evaluator.evaluate(xpath, doc, null, dom.window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        const parent = node.parentElement;
        const username = parent.getElementsByClassName("member_info membertip ").item(0).getAttribute("href").split("/")[2];
        const postTime = parent.getElementsByClassName("timeago").item(0).getAttribute("title");
        let postMessage = parent.getElementsByClassName("core_read_more").item(0).innerHTML;

        allPosts[parent.parentElement.getAttribute("data-id")] = {
            username: username,
            post: {
                uploadDate: new Date(postTime).toISOString(),
                content: postMessage
            }
        };
    }

    fs.writeFileSync(dataPath, JSON.stringify(allPosts, null, 4));
    return allPosts;
}

function isValidRealmCode(code) {
    return /[a-z]/.test(code) && /[A-Z]/.test(code) && /^[a-zA-Z0-9_-]{11}$/.test(code);
}

function extractCodesFromPosts(username) {
    let allPosts = {};
    try {
        allPosts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (err) {
        console.log("Error reading the JSON file:", err);
    }

    const codes = [];

    for (const [id, data] of Object.entries(allPosts)) {
        if (username && data.username !== username) {
            continue;
        }

        const postCodes = data.post.content.match(/\b[a-zA-Z0-9_-]{11}\b/g) || [];
        for (const code of postCodes) {
            if (isValidRealmCode(code)) {
                codes.push({ username: data.username, code });
            }
        }
    }

    return codes;
}

function lookupUserInPosts(username) {
    let allPosts = {};
    try {
        allPosts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (err) {
        console.log("Error reading the JSON file:", err);
        return null;
    }

    for (const [id, data] of Object.entries(allPosts)) {
        if (data.username === username) {
            return data;
        }
    }
    return null;
}

function htmlToPlainText(html) {
    const dom = new JSDOM(html);
    return dom.window.document.body.textContent || "";
}

module.exports = {
    command: new SlashCommandBuilder()
        .setName('pmc-scraper')
        .setDescription('Scrapes the specified Planet Minecraft page for posts and saves them.')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The username to filter posts by')
                .setRequired(false)),

    callback: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        try {
            await scrapePage();
            const username = interaction.options.getString('username');
            const codes = extractCodesFromPosts(username);

            if (codes.length === 0) {
                await interaction.editReply({ content: `No valid realm codes found for the specified username: ${username || 'all users'}.`, ephemeral: true });
                return;
            }

            for (const data of codes) {
                const userData = lookupUserInPosts(data.username);
                const plainTextContent = htmlToPlainText(userData.post.content);
                const timestamp = Math.floor(new Date(userData.post.uploadDate).getTime() / 1000);

                const message = `New Realm code Scraped\n**Code by ${data.username}**: ${data.code}\n**Post Content**: ${plainTextContent || 'N/A'}\n**Upload Date**: <t:${timestamp}:R>`;

                await interaction.followUp({ content: message, ephemeral: true });
            }

            await interaction.editReply({ content: 'Scraping completed! The results have been sent.', ephemeral: true });
        } catch (error) {
            console.error('Error during scraping:', error);
            await interaction.editReply({ content: 'An error occurred while trying to scrape the page.', ephemeral: true });
        }
    }
};
