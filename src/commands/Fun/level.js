const { sync, perGuildLeveling, perGuildSettings } = require(`${process.cwd()}/passthrough.js`);
const { XpRequiredForLevelOne, XpSecreteSauce } = sync.require(`${process.cwd()}/config.json`);
const { MessageAttachment } = require('discord.js')
const fs = require('fs');
const puppeteer = require('puppeteer');
const utils = sync.require(`${process.cwd()}/utils`);

module.exports = {
    name: 'level',
    category: 'Fun',
    description: 'Displays your level',
    ContextMenu: {},
    syntax : '{prefix}{name} <specific user mention>',
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

        if(options.get('enabled') === undefined || options.get('enabled') !== 'true') return await utils.reply(ctx,`Leveling is disabled in this server (and still being worked on ⚆_⚆)`);

        const member =  ctx.cType === 'COMMAND' ? (ctx.options.getMember('user') || ctx.member ) : ( ctx.mentions.members.first() || ctx.member);

        const levelingData = perGuildLeveling.get(ctx.guild.id) || {}
        const levelData = levelingData[member.id] || {};
        const level = levelData.level || 0;
        const currentXp = ((levelData.currentXp || 0.001) / 1000 ).toFixed(2);

        const backgroundUrl = levelData.background || `https://cdnb.artstation.com/p/marketplace/presentation_assets/000/106/277/large/file.jpg`;

        if(ctx.cType === 'COMMAND') await ctx.deferReply();

        if(member.user.bot) return await utils.reply(ctx,'Bots are too sweaty to participate in leveling');

        const avatarUrl = member.displayAvatarURL({ format: 'png', size: 1024 });
        const displayName = member.displayName;
        const rank = 1;
        const requiredXp = (getXpForNextLevel(level) / 1000).toFixed(2);

        const cardAsHtml = `<!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta http-equiv="X-UA-Compatible" content="ie=edge" />
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500&display=swap');
        
                :root {
                    --main-color: #87ceeb;
                    --progress-percent: ${(currentXp/requiredXp) * 100}%;
                    --opacity : 0.8;
                }
        
                h1 {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 500;
                    font-size: 40px;
                    display: block;
                    color: white;
                    margin: 0;
                }
        
                h2 {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 300;
                    font-size: 30px;
                    display: block;
                    color: white;
                    margin: 0;
                }
        
                h3 {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 200;
                    font-size: 20px;
                    display: block;
                    color: white;
                    margin: 0;
                }
        
                body {
                    font-family: "Poppins", Arial, Helvetica, sans-serif;
                    background: rgb(22, 22, 22);
                    color: #222;
                    width: 1000px;
                    height: 300px;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: transparent;
                }
        
                .user-profile {
                    position: relative;
                    min-width: 184px;
                    width: 184px;
                    height: 184px;
                    display: block;
                }
        
                .user-rank-info {
                    width: inherit;
                    height: inherit;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                }
        
        
        
        
                .user-rank-info-row {
                    width: 100%;
                    height: 50px;
                    display: flex;
                    flex-direction: row;
                    position: relative;
                    justify-content: space-between;
                    box-sizing: border-box;
                    padding: 0 20px;
                }
        
                .user-rank-info-row[pos='top'] {
                    height: 70px;
                }
        
                .user-rank-info-row[pos='middle'] {
                    height: 60px;
                    align-items: center;
                }
        
                .user-rank-info-bar{
                    display: block;
                    background-color: grey;
                    width: 100%;
                    height: 30px;
                    box-sizing: border-box;
                    border-radius: 20px;
                }
        
                .user-rank-info-progress{
                    display: block;
                    background-color: var(--main-color);
                    width: var(--progress-percent);
                    height: 30px;
                    box-sizing: border-box;
                    border-radius: 20px;
                }
        
        
        
                .user-rank-info-row[pos='top']::after {
                    content: '';
                    display: block;
                    height: 1px;
                    width: 686px;
                    background-color: var(--main-color);
                    position: absolute;
                    top: 100%;
                }
        
        
        
                .user-profile img {
                    position: absolute;
                    width: 180px;
                    height: 180px;
                    border-radius: 110px;
                    border: 2px groove black;
                    display: inline-block;
                }
        
                .online-status {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    border-radius: 100px;
                    background-color: green;
                    border: 2px solid black;
                    display: inline-block;
                    transform: translateY(-50%) translateX(-50%);
                    left: 85%;
                    top: 85%;
                }
        
                .main {
                    position: relative;
                    width: 950px;
                    height: 220px;
                    display: flex;
                    flex-direction: row;
                    overflow: hidden;
                    background-color: rgba(34, 34, 34, var(--opacity));
                    justify-content: flex-start;
                    align-items: center;
                    box-sizing: border-box;
                    padding: 20px;
                    border-radius: 8px;
                }
        
                .background {
                    width: 1000px;
                    height: 300px;
                    object-fit: cover;
                    position: fixed;
                    border-radius: 8px;
                }
            </style>
        </head>
        
        <body>
            <img class="background" src="${backgroundUrl}" />
            <div class="main">
                <div class="user-profile">
                    <img
                        src="${avatarUrl}" />
                    
                </div>
                <div class="user-rank-info">
                    <div class="user-rank-info-row" pos='top'>
                        <h1>${displayName}</h1> <h1>RANK ${rank}</h1>
                    </div>
                    <div class="user-rank-info-row" pos='middle'>
                        <h2>Level ${level}</h2> <h2>${currentXp}k/${requiredXp}k</h2>
                    </div>
                    <div class="user-rank-info-row">
                        <div class="user-rank-info-bar">
                            <div class="user-rank-info-progress"></div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        
        </html>`

        //<div class="online-status"></div>

        
        const browser = await puppeteer.launch({ headless: true, args:['--no-sandbox'] ,userDataDir: `${process.cwd()}/../puppeter` });
        const page = await browser.newPage();

        page.setViewport({width : 1200,height : 400});
        
        await page.setContent(cardAsHtml);
        const content = await page.$("body");
        const imageBuffer = await content.screenshot({ omitBackground: true });

        await page.close();
        await browser.close();


        await utils.reply(ctx, { files: [{ attachment: imageBuffer }]});
    }
}