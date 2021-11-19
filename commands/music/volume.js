

module.exports = {
    name: 'volume',
    category: 'Music',
    description : 'sets the music volume',
    ContextMenu: {},
    options : [
        {
            name : 'Ammount',
            description: "The new volume value",
            type: 4,
            required: false
        }
    ],
    async execute(bot,ctx)
    {
        return ctx.reply('Work in progress');
    }
}