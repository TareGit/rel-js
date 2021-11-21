const { Queue } = require(`${process.cwd()}/handlers/handle_music_queue`);

module.exports = {
    name: 'save',
    category: 'Music',
    description: 'Saves the current queue',
    ContextMenu: {},
    options: [
        {
            name: 'name',
            description: "The name to save the queue as",
            type: 3,
            required: false
        }
    ],
    async execute(bot, ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return ctx.reply("You need to be in a voice channel to use this command");

            const Queue = bot.Queues.get(ctx.member.guild.id);

            if (Queue == undefined) return ctx.reply("Theres no Queue");

            Queue.saveQueue(ctx);
        

    }
}