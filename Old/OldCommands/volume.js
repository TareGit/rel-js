'use strict';

const { sync, queues } = require(`${process.cwd()}/dataBus.js`);
const { setVolume } = sync.require(`${process.cwd()}/handlers/handleMusic`);

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'volume',
    category: 'Music',
    description: 'Sets the music volume',
    ContextMenu: {},
    syntax: '{prefix}{name} <new volume level 1 - 100>',
    options: [
        {
            name: 'volume',
            description: "The new volume value",
            type: 4,
            required: true
        }
    ],
    async execute(ctx) {

        if (!ctx.guild || !ctx.member.voice.channel) return utils.reply(ctx, "You need to be in a voice channel to use this command");

        const Queue = queues.get(ctx.member.guild.id);

        if (Queue == undefined) return utils.reply(ctx, "Theres no Queue");

        setVolume(ctx, Queue);
    }
}