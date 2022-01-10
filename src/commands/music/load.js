const { sync } = require(`${process.cwd()}/passthrough.js`);
const { createQueue, loadQueue } = sync.require(`${process.cwd()}/handlers/handle_music`);

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'load',
    category: 'Music',
    description: 'Loads a saved Queue',
    syntax : '{prefix}{name} <playlist name>',
    ContextMenu: {},
    options: [
        {
            name: 'name',
            description: "The name of the playlist to load",
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return utils.reply(ctx,"You need to be in a voice channel to use this command");

            let Queue = ps.queues.get(ctx.member.guild.id);

            if (Queue == undefined) {
                Queue = await createQueue(ps.bot, ctx);
            }

            await loadQueue(ctx,Queue);
        

    }
}