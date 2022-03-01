const axios = require('axios');
const { bot, commandsPaths, commands, modulesLastReloadTime } = require("./dataBus");

/**
 * Generates a random float (inclusive)
 * @param {Number}min
 * @param {Number}max
 * @returns {Number} The random float
 */
function randomFloatInRange(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer (inclusive)
 * @param {Number}min
 * @param {Number}max
 * @returns {Number} The random integer
 */
function randomIntegerInRange(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

/**
 * Calculates the xp required to get to the next level
 * @param {Number}level The current level
 * @returns {Number}The xp required
 */
function getXpForNextLevel(level) {
    return (level ** 2) * 3 + 100;
}

/**
 * Calculates the total xp at a specific level
 * @param {Number}level The level to get the xp for
 * @returns {Number}The total xp
 */
function getTotalXp(level) {
    return (0.5 * (level + 1)) * ((level ** 2) * 2 + level + 200);
}

function time(sep = '') {

    const currentDate = new Date();

    if (sep === '') {
        return currentDate.toUTCString();
    }

    const date = ("0" + currentDate.getUTCDate()).slice(-2);

    const month = ("0" + (currentDate.getUTCMonth() + 1)).slice(-2);

    const year = currentDate.getUTCFullYear();

    const hours = ("0" + (currentDate.getUTCHours())).slice(-2);

    const minutes = ("0" + (currentDate.getUTCMinutes())).slice(-2);

    const seconds = ("0" + currentDate.getUTCSeconds()).slice(-2);

    return `${year}${sep}${month}${sep}${date}${sep}${hours}${sep}${minutes}${sep}${seconds}`;
}

/**
 * Logs stuff
 * @param args What to log
 */
function log() {

    const argumentValues = Object.values(arguments);
    
    const stack = new Error().stack;
    const pathDelimiter = process.platform !== 'win32' ? '/' : '\\';
    const simplifiedStack = stack.split('\n')[2].split(pathDelimiter);
    const file = simplifiedStack[simplifiedStack.length - 1].split(')')[0];
    argumentValues.unshift(`${file} ::`);

    if(bot && bot.cluster){
        argumentValues.unshift(`Cluster ${bot.cluster.id} ::`);
    }
    else{
        argumentValues.unshift(`Manager ::`);
    } 
    
    argumentValues.unshift(`${time(':')} ::`);

    console.log.apply(null, argumentValues);
}

/**
 * Replies a message/command
 * @param ctx The message/command
 * @param payload The content to send
 * @returns {Message} The reply
 */
async function reply(ctx, payload) {

    try {

        if(!ctx) return undefined;

        if(!ctx.channel.permissionsFor(ctx.guild.me).has("SEND_MESSAGES")){
            if(ctx.author) return await ctx.author.send(payload).catch((error)=>log('Error sending message',error));
            return undefined;
        }

        if (ctx.cType === 'MESSAGE') {
            return await ctx.reply(payload).catch((error)=>log('Error sending message',error));
        }
        else {
            if (ctx.forceChannelReply !== undefined) {
                if (ctx.forceChannelReply === true)
                {
                    return await ctx.channel.send(payload).catch((error)=>log('Error sending message',error));
                } 
            }

            if (ctx.deferred !== undefined) {

                if (ctx.replied) return await ctx.channel.send(payload).catch((error)=>log('Error sending message',error));

                if (ctx.deferred) return await ctx.editReply(payload).catch((error)=>log('Error sending message',error));

                return await ctx.reply(payload).catch((error)=>log('Error sending message',error));
            }
            else {
                return await ctx.reply(payload).catch((error)=>log('Error sending message',error));
            }
        }
    } catch (error) {
        log(`Error sending message\x1b[0m\n`, error);
    }

}

const addNewCommand = async function (path) {

    const pathAsArray = process.platform !== 'win32' ? path.split('/') : path.split('\\');

    try {


        const command = require(`./${path}`);

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);// remove .js

        commands.set(fileName, command);

        if (command.ContextMenu !== undefined && command.ContextMenu.name !== undefined) {
            commands.set(command.ContextMenu.name, command);
        }

        if (commandsPaths.get(command.category) === undefined) {

            commandsPaths.set(command.category, [])
        }

        commandsPaths.get(command.category).push(path);

    } catch (error) {
        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        log(`Error loading ${fileName}\x1b[0m\n`, error);
    }
}

const reloadCommand = async function (path) {
    const pathAsArray = process.platform !== 'win32' ? path.split('/') : path.split('\\');

    try {

        const cachedValue = require.cache[require.resolve(`./${path}`)]

        if (cachedValue !== undefined) delete require.cache[require.resolve(`./${path}`)];

        const command = require(`./${path}`);

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        commands.set(fileName, command);

        if (command.ContextMenu !== undefined && command.ContextMenu.name !== undefined) {
            commands.set(command.ContextMenu.name, command);
        }



    } catch (error) {

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        log(`Error reloading command ${fileName}\x1b[0m\n`, error);
    }
}

const deleteCommand = async function (path) {
    const pathAsArray = process.platform !== 'win32' ? path.split('/') : path.split('\\');

    try {

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        if (commands.get(fileName)) {
            const command = commands.get(fileName);

            const categoryPaths = commandsPaths.get(command.category);

            categoryPaths.splice(categoryPaths.indexOf(path), 1);
            const cachedValue = require.cache[require.resolve(`./${path}`)]
            if (cachedValue !== undefined) delete require.cache[require.resolve(`./${path}`)];

            if (command.ContextMenu !== undefined && command.ContextMenu.name !== undefined) {
                commands.delete(command.ContextMenu.name);
            }

            commands.delete(fileName);
        }

    } catch (error) {

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        log(`Error deleting command ${fileName}\x1b[0m\n`, error);
    }
}

const reloadCommandCategory = async function (category) {

    try {
        const commandsToReload = commandsPaths.get(category);

        if (commandsToReload === undefined) return;

        commandsToReload.forEach(function (path, index) {
            reloadCommand(path);
        });
    } catch (error) {
        log(`Error reloading category ${category}\x1b[0m\n`, error);
    }

}

const reloadCommands = async function (category) {

    const commandsToReload = commandsPaths.get(category);

    if (commandsToReload === undefined) return;
}

const handleCommandDirectoryChanges = async function (event, path) {

    const pathAsArray = process.platform !== 'win32' ? path.split('/') : path.split('\\');

    switch (event) {

        case 'add':
            addNewCommand(path);
            break;

        case 'change':
            reloadCommand(path);
            break;

        case 'unlink':
            deleteCommand(path);
            break;
    }

}

async function getOsuApiToken() {
    const request = {
        client_id: process.env.OSU_CLIENT_ID,
        client_secret: process.env.OSU_CLIENT_SECRETE,
        grant_type: "client_credentials",
        scope: "public"
    };

    const response = (await axios.post(`${process.env.OSU_API_AUTH}`, request)).data;

    process.env.OSU_API_TOKEN = response.access_token;

    setTimeout(getOsuApiToken, (response.expires_in * 1000) - 200);

    log("Done fetching Osu Api Token");
}

async function getSpotifyApiToken() {

    const params = new URLSearchParams({ grant_type: 'client_credentials' });

    const headers = {
        Authorization: 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRETE).toString('base64')),
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    try {

        const response = (await axios.post(`${process.env.SPOTIFY_API_AUTH}`, params, { headers: headers })).data;

        process.env.SPOTIFY_API_TOKEN = response.access_token;

        setTimeout(getSpotifyApiToken, (response.expires_in * 1000) - 200);

        log("Done fetching Spotify Api Token");
    } catch (error) {
        log(`Error Fetching Spotify Token\n`, error)
    }

}

function generateCardHtml(color,opacity,background,avatar,rankText,level,displayName,currentXp,requiredXp)
{
    const card = `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500&display=swap');
    
            :root {
                --main-color: ${color};
                --progress-percent: ${(currentXp / requiredXp) * 100}%;
                --opacity : ${opacity};
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
        <img class="background" src="${background}" />
        <div class="main">
            <div class="user-profile">
                <img
                    src="${avatar}" />
                
            </div>
            <div class="user-rank-info">
                <div class="user-rank-info-row" pos='top'>
                    <h1>${displayName}</h1> <h1>${rankText}</h1>
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

    return card;
}

module.exports = {
    randomFloatInRange : randomFloatInRange,
    randomIntegerInRange : randomIntegerInRange,
    getXpForNextLevel : getXpForNextLevel,
    getTotalXp : getTotalXp,
    log : log,
    reply : reply,
    reloadCommands : reloadCommands,
    handleCommandDirectoryChanges : handleCommandDirectoryChanges,
    getOsuApiToken : getOsuApiToken,
    getSpotifyApiToken : getSpotifyApiToken,
    reloadCommandCategory : reloadCommandCategory,
    generateCardHtml : generateCardHtml
}



if (modulesLastReloadTime.utils !== undefined) {
    log('Global Utils Reloaded\x1b[0m');
}
else {
    log('Global Utils Loaded\x1b[0m');
}

if (bot) {
    modulesLastReloadTime.utils = bot.uptime;
}
else {
    modulesLastReloadTime.utils = 0;
}