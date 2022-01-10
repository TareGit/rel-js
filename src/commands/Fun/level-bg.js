const { sync, perGuildLeveling, perGuildSettings } = require(`${process.cwd()}/passthrough.js`);
const { XpRequiredForLevelOne, XpSecreteSauce } = sync.require(`${process.cwd()}/config.json`);
const { MessageAttachment } = require('discord.js')
const fs = require('fs');
const puppeteer = require('puppeteer');

const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'level-bg',
    category: 'Fun',
    description: 'Sets your level card background',
    ContextMenu: {},
    syntax : '{prefix}{name} <specific user mention>',
    options: [
        {
            name: 'link',
            description: 'The link to the new background (currently is not validated)',
            type: 3,
            required: false
        }
    ],
    async execute(ctx) {
        if (ctx.guild === null) return utils.reply(ctx, `You need to be in a server to use this command`);
        
        const options = perGuildSettings.get(ctx.guild.id).leveling_options;

        if(options.get('enabled') === undefined || options.get('enabled') !== 'true') return await utils.reply(ctx,`Leveling is disabled in this server (and still being worked on ⚆_⚆)`);

        const member =  ctx.cType === 'COMMAND' ? (ctx.options.getMember('user') || ctx.member) : (ctx.mentions.members.first() || ctx.member);

        if (perGuildLeveling.get(ctx.guild.id) === undefined) perGuildLeveling.set(ctx.guild.id, {});

        const levelingData = perGuildLeveling.get(ctx.guild.id);

        if (levelingData[ctx.member.id] === undefined) levelingData[ctx.member.id] = {level : 0, currentXp : 0};

        levelingData[ctx.member.id].background = ctx.pureContent;

       utils.reply(ctx,'Background Changed');
    }
}