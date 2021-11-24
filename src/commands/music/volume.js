
const ps = require(`${process.cwd()}/passthrough`);

module.exports = {
    name: 'volume',
    category: 'Music',
    description: 'sets the music volume',
    ContextMenu: {},
    options: [
        {
            name: 'Ammount',
            description: "The new volume value",
            type: 4,
            required: false
        }
    ],
    async execute(ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return ctx.reply("You need to be in a voice channel to use this command");

            const Queue = ps.queues.get(ctx.member.guild.id);

            if (Queue == undefined) return ctx.reply("Theres no Queue");

            Queue.setVolume(ctx);
        

    }
}