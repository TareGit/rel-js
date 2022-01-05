
const { sync } = require(`${process.cwd()}/passthrough.js`);

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'mute',
    category: 'Moderation',
    description: 'Mute\'s a user for the specified number of minutes',
    ContextMenu: {},
    syntax : '{prefix}{name} <user mention>',
    options: [
        {
            name: 'user',
            description: 'The user to mute',
            type: 6,
            required: true
        },
        {
            name: 'minutes',
            description: 'The number of minutes to mute the user for',
            type: 4,
            required: true
        }
    ],
    async execute(ctx) {

       utils.reply(ctx,'bruh don\'t be a bitch')
    }
}