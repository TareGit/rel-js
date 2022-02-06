const { sync, perGuildLeveling, perGuildSettings, db, perUserData} = require(`${process.cwd()}/dataBus.js`);
const { XpRequiredForLevelOne, XpSecreteSauce } = sync.require(`${process.cwd()}/config.json`);
const { MessageAttachment } = require('discord.js')
const fs = require('fs');
const axios = require('axios');
const puppeteer = require('puppeteer');
const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'level',
    category: 'Fun',
    description: 'Displays your level',
    ContextMenu: {},
    syntax: '{prefix}{name} <specific user mention>',
    options: [
        {
            name: 'user',
            description: 'The user to check the level of',
            type: 6,
            required: false
        }
    ],
    async execute(ctx) {
        if (ctx.guild === null) return utils.reply(ctx, `You need to be in a server to use this command`);

        const options = perGuildSettings.get(ctx.guild.id).leveling_options;

        // check if leveling is enabled
        if (!options.get('location') || options.get('location') === 'disabled') return await utils.reply(ctx, `Leveling is disabled in this server`);

        // select the member specified 
        const specificUser = ctx.cType === 'COMMAND' ? (ctx.options.getMember('user') || ctx.member) : (ctx.mentions.members.first() || ctx.member);

        // no point in bots participating in leveling
        if (specificUser.user.bot) return await utils.reply(ctx, 'Bots are too sweaty to participate in leveling');

        // get the guilds leveling data
        const levelingData = perGuildLeveling.get(ctx.guild.id) || {};

        // get the specified users leveling data 
        const levelData = levelingData[specificUser.id] || {};

        // get the users level or 0 if the user has no data
        const level = levelData.level || 0;

        // get the users current XP
        const currentXp = ((levelData.currentXp || 1) / 1000).toFixed(2);

        // defer the reply to give puppeter time to render and incase we make an API call
        if (ctx.cType === 'COMMAND') await ctx.deferReply();

        // fetch data from database since we don't currently have it
        if (!perUserData.get(specificUser.id)) {

            const user_settings_response = await db.get(`/tables/user_settings/rows?data=${specificUser.id}`);

            const user_settings_data = user_settings_response.data;

            if (user_settings_data.error) {
                // need to handle this error better
                utils.log(`Error Fetchig User Data : "${user_settings_data.error}" \x1b[0m`);
            }
            else {

                // get the rows from the database
                const rows = user_settings_data;

                // make sure we actually have information to work with
                if (rows.length) {

                    // add the user's data to our memory
                    perUserData.set(specificUser.id, rows[0]);

                    // convert the afk_options from string to URLSearchParams that we can query as required
                    perUserData.get(specificUser.id).afk_options = new URLSearchParams(perUserData.get(specificUser.id).afk_options);

                    // tell the server to inform us of future updates concerning this user
                    axios.post(`${process.env.SERVER_API}/notifications-user`, { op: 'add', data: [specificUser.id], target: `${process.env.CLUSTER_API}/user-update` }).catch((error) => utils.log('Error making request to server', error.message));
                }

            }
        }

        // select the specific users background or use the default if it is not available
        const userBackground = perUserData.get(specificUser.id) ? perUserData.get(specificUser.id).card_bg_url : `https://cdnb.artstation.com/p/marketplace/presentation_assets/000/106/277/large/file.jpg`;

        // the specific users avatar url
        const avatarUrl = specificUser.displayAvatarURL({ format: 'png', size: 1024 });

        const displayName = specificUser.displayName;

        const rank = levelingData.ranking && levelingData.ranking.includes(specificUser.id)  ? levelingData.ranking.indexOf(specificUser.id) + 1 : undefined;

        const rankText = typeof rank === 'number' ? `RANK ${rank}` : 'UNRANKED';

        const requiredXp = (utils.getXpForNextLevel(level) / 1000).toFixed(2);

        const userColor = perUserData.get(specificUser.id) ? perUserData.get(specificUser.id).color : '#87ceeb';

        const userOpacity = perUserData.get(specificUser.id) ? perUserData.get(specificUser.id).card_opacity : '0.8';

        const cardAsHtml = utils.generateCardHtml(userColor,userOpacity,userBackground,avatarUrl,rankText,level,displayName,currentXp,requiredXp);

        // start a puppeteer browser
        /*if(!browser)
        {
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], userDataDir: `${process.cwd()}/../puppeter` });
            
            Object.assign(dataBus,{
                browser : require(`${process.cwd()}/dataBus.js`);
            })
        }*/
        

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], userDataDir: `${process.cwd()}/../puppeter` });
        // create a new window and capture the ranked card
        const page = await browser.newPage();
        page.setViewport({ width: 1200, height: 400 });
        await page.setContent(cardAsHtml);
        const content = await page.$("body");
        const imageBuffer = await content.screenshot({ omitBackground: true });

        // shut down puppeteer
        await page.close();
        await browser.close();
        
        // send the level card
        await utils.reply(ctx, { files: [{ attachment: imageBuffer }] });
    }
}