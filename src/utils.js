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
            return await ctx.reply(payload);
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
    reloadCommandCategory : reloadCommandCategory
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