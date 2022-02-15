
const { sync, queues } = require(`${process.cwd()}/dataBus.js`);
const { stop } = sync.require(`${process.cwd()}/handlers/handleMusic`);

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'stop',
    category: 'Music',
    description: 'Stops the current song and disconnects the bot from the channel',
    ContextMenu: {},
    syntax : '{prefix}{name}',
    options: [],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return utils.reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) return utils.reply(ctx,"Theres no Queue");
            
            await stop(ctx,Queue);
        

    }
}