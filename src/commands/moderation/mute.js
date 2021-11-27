
const ps = require(`${process.cwd()}/passthrough`);

module.exports = {
    name: 'mute',
    category: 'Moderation',
    description: 'mute\'s a user for the specified number of minutes',
    ContextMenu: {},
    options: [
        {
            name: 'user',
            description: 'the user to mute',
            type: 4,
            required: true
        },
        {
            name: 'minutes',
            description: 'the number of minutes to mute the user for',
            type: 4,
            required: true
        }
    ],
    async execute(ctx) {

        ctx.reply('bruh don\'t be a bitch')
    }
}