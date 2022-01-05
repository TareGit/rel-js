
const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { showNowPlaying } = sync.require(`${process.cwd()}/handlers/handle_music`);

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'now',
    category: 'Music',
    description: 'Shows the currently playing song',
    syntax : '{prefix}{name}',
    ContextMenu: {},
    options: [],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) returnutils.reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) returnutils.reply(ctx,"Theres no Queue");

            await showNowPlaying(ctx,Queue);
        

    }
}