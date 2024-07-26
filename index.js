const fs = require('fs');
const colors = require("./colors.js");

console = { ...console, ...colors }
const _o_write = process.stdout.write;

Object.defineProperties(String.prototype, {
    "clean": {
        get: function() {
            const nonUTF8Regex = /[^\x00-\x7F]/g;
            return this.toString().replace(nonUTF8Regex, '').replace(/\x1B\[.*?m/g, '');
        }
    }
});

const logStream = fs.createWriteStream(__dirname + "/stdout.log", { flags: 'a' }); 
process.stdout.write = function(buffer, encoding, cb) {
    buffer = buffer + console.default
    logStream.write(buffer.clean);
    _o_write.apply(this, arguments);
};

const config = require(__dirname + "/config.json");
const discord = require("discord.js");

const client = new discord.Client({ intents: 32767 });

client.login(config.token).then(() => {
    require("./discord/index.js").onLogin(client);
    require("./discord/discordcommands/commandhandel/creatcommand/registercommand/registercommand.js")(client);  
});
