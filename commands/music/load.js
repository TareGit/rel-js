

module.exports = {
    name: 'load',
    category: 'Music',
    description : 'loads a saved Queue',
    ContextMenu: {},
    options : [
        {
            name : 'name',
            description: "the name of the playlist to load",
            type: 3,
            required: false
        }
    ],
    async execute(bot,ctx)
    {
        return ctx.reply('Work in progress');
    }
}