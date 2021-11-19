

module.exports = {
    name: 'remove',
    category: 'Music',
    description : 'removes a song in the queue',
    ContextMenu: {},
    options : [
        {
            name : 'item',
            description: "The song to remove or its index",
            type: 3,
            required: true
        }
    ],
    async execute(bot,ctx)
    {
        return ctx.reply('Work in progress');
    }
}