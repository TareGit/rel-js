
const { sync, queues } = require(`${process.cwd()}/passthrough.js`);
const { pauseSong } = sync.require(`${process.cwd()}/handlers/handle_music`);

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'pause',
    category: 'Music',
    description: 'Pauses the current song',
    ContextMenu: {},
    syntax : '{prefix}{name}',
    options: [],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) returnutils.reply(ctx,"You need to be in a voice channel to use this command");

            const Queue = queues.get(ctx.member.guild.id);

            if (Queue == undefined) returnutils.reply(ctx,"Theres no Queue");

            utils.log(`${ctx.forceChannelReply} Before pause`)

            await pauseSong(ctx,Queue);
        

    }
}