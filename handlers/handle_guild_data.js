const EventEmitter = require("events");

class GuildDataHandler extends EventEmitter {
    constructor(bot)
    {
        this.bot = bot;
    }
}
module.exports.GuildDataHandler = GuildDataHandler;