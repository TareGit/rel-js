
const { sync } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

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

        reply(ctx,'bruh don\'t be a bitch')
    }
}