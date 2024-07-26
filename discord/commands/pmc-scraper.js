const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { SlashCommandBuilder, EmbedBuilder, WebhookClient } = require('discord.js');

// trippel helped me making this :d

const dataPath = path.join(__dirname, '..', '..', 'data', 'pmcscraper.json');

fs.mkdirSync(path.dirname(dataPath), { recursive: true });

// Webhook URL
const webhookURL = '';

// Create webhook client
const webhookClient = new WebhookClient({ url: webhookURL });

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
        let postMessage = parent.getElementsByClassName("core_read_more").item(0).innerHTML.replace(/<br>/g, "\n");
        
        // parsing the post message to remove unnecessary tags and add links
        postMessage = postMessage.replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/, (_, url, text) => {
            url = url.split(" ")[0].trim();
            text = text.trim();
            if (url == text)
                return ` ${text}`;
            return ` ${text} ( ${url} )`
        });

        // remove all html tags from the post message to make it plain text
        postMessage = postMessage.replace(/<[^>]+>/g, " ");

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

function extractCodesFromPosts() {
    let allPosts = {};
    try {
        allPosts = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (err) {
        console.log("Error reading the JSON file:", err);
    }

    const codes = [];

    for (const [id, data] of Object.entries(allPosts)) {
        const postCodes = data.post.content.match(/\b[a-zA-Z0-9_-]{11}\b/g) || [];
        for (const code of postCodes) {
            if (isValidRealmCode(code)) {
                codes.push({ username: data.username, code });
            }
        }
    }

    return codes;
}

module.exports = {
    command: new SlashCommandBuilder()
        .setName('pmc-scraper')
        .setDescription('Scrapes the specified Planet Minecraft page for posts and saves them.'),

    callback: async (interaction) => {
        await interaction.deferReply();

        try {
            await scrapePage();
            const codes = extractCodesFromPosts();

            for (const data of codes) {
                const embed = new EmbedBuilder()
                    .setTitle(`New Realm code Scraped`)
                    .addFields(
                        { name: `Code by ${data.username}`, value: `${data.code}` }
                    )
                    .setColor(136);

                await webhookClient.send({ embeds: [embed] });
            }

            await interaction.editReply('Scraping completed! The results have been sent to the webhook.');
        } catch (error) {
            console.error('Error during scraping:', error);
            await interaction.editReply('An error occurred while trying to scrape the page.');
        }
    }
};
