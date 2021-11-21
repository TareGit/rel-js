module.exports = {
    name: 'playlists',
    category: 'Music',
    description: 'Shows all saved playlists',
    ContextMenu: {},
    options: [],
    async execute(bot, ctx) {
        
            if (!ctx.guild || !ctx.member.voice.channel) return ctx.reply("You need to be in a voice channel to use this command");

            const Queue = bot.Queues.get(ctx.member.guild.id);

            if (Queue == undefined) return ctx.reply("Theres no Queue");

            Queue.showQueue(ctx);
        

    }
}