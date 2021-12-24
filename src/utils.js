// handle replies

const { tracker } = require("cassandra-driver");
const axios = require('axios');
const { sync, commandsPaths, commands } = require("./passthrough");
const { response } = require("express");

const reply = async function (ctx, reply) {

    try {
        if (ctx.cType === 'MESSAGE') {
            return await ctx.reply(reply);
        }
        else {
            if (ctx.forceChannelReply !== undefined) {
                if (ctx.forceChannelReply === true) return await ctx.channel.send(reply);
            }

            if (ctx.deferred !== undefined) {

                if (ctx.replied) return await ctx.channel.send(reply);

                if (ctx.deferred) return await ctx.editReply(reply);

                return await ctx.reply(reply);
            }
            else {
                return await ctx.reply(reply);
            }
        }
    } catch (error) {
        console.log(`Error sending message \n ${error}`);
    }

}

const addNewCommand = async function (path) {

    const pathAsArray = process.platform === 'linux' ? path.split('/') : path.split('\\');

    try {


        const command = sync.require(`./${path}`);

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);// remove .js

        commands.set(fileName, command);

        if (command.ContextMenu !== undefined && command.ContextMenu.name !== undefined) {
            console.log('Loaded context menu command ' + command.ContextMenu.name);
            commands.set(command.ContextMenu.name, command);
        }

        console.log('Loaded command ' + fileName);

        if (commandsPaths.get(command.category) === undefined) {

            commandsPaths.set(command.category, [])
        }

        commandsPaths.get(command.category).push(path);

    } catch (error) {
        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        console.log(`Error loading ${fileName} \n `);
        console.log(error);
    }
}

const reloadCommand = async function (path) {
    const pathAsArray = process.platform === 'linux' ? path.split('/') : path.split('\\');

    try {

        const cachedValue = require.cache[require.resolve(`./${path}`)]

        if (cachedValue !== undefined) delete require.cache[require.resolve(`./${path}`)];

        const command = require(`./${path}`);

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        commands.set(fileName, command);

        if (command.ContextMenu !== undefined && command.ContextMenu.name !== undefined) {
            console.log('Reloaded context menu command ' + command.ContextMenu.name);
            commands.set(command.ContextMenu.name, command);
        }

        console.log('Reloaded command ' + fileName);

    } catch (error) {

        const fileName = pathAsArray[pathAsArray.length - 1].slice(0, -3);

        console.log(`Error reloading ${fileName} \n `);
        console.log(error);
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
        console.log(`Error reloading category ${category} \n `);
        console.log(error);
    }

}

const reloadCommands = async function (category) {

    const commandsToReload = commandsPaths.get(category);

    if (commandsToReload === undefined) return;
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

    setTimeout(getOsuApiToken,(response.expires_in * 1000) - 200);
    
    console.log("Done fetching Osu Api Token");
}

async function getSpotifyApiToken() {

    const params = new URLSearchParams({ grant_type : 'client_credentials' });

    const headers = {
        Authorization: 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRETE).toString('base64')),
        'Content-Type' : 'application/x-www-form-urlencoded'
    }

    try {
        
    const response = (await axios.post(`${process.env.SPOTIFY_API_AUTH}`, params, {headers : headers})).data;

    process.env.SPOTIFY_API_TOKEN = response.access_token;

    setTimeout(getSpotifyApiToken,(response.expires_in * 1000) - 200);
    
    console.log("Done fetching Spotify Api Token");
    } catch (error) {
        console.log(error)
    }
    
}

function logError(message,error) {
    error.message = `\n${message}\n` + error.message;
    console.log(error);
}

module.exports.reply = reply;

module.exports.addNewCommand = addNewCommand;

module.exports.reloadCommand = reloadCommand;

module.exports.reloadCommandCategory = reloadCommandCategory;

module.exports.reloadCommands = reloadCommands;

module.exports.getOsuApiToken = getOsuApiToken;

module.exports.getSpotifyApiToken = getSpotifyApiToken;

module.exports.logError = logError