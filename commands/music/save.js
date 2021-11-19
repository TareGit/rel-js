

module.exports = {
    name: 'save',
    category: 'Music',
    description : 'Saves the current queue',
    ContextMenu: {},
    options : [
        {
            name : 'name',
            description: "The name to save the queue as",
            type: 3,
            required: false
        }
    ],
    async execute(bot,ctx)
    {
        return ctx.reply('Work in progress');
    }
}