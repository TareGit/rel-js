const ps = require(`${process.cwd()}/passthrough.js`);
const { sync, bot, socket, socketEvents, modulesLastReloadTime, perGuildData } = require(`${process.cwd()}/passthrough.js`);
const { logError } = sync.require(`${process.cwd()}/utils.js`);

const fs = require('fs');

const { io } = require("socket.io-client");

let socketRef = socket;

// On connect to the server
function onConnect() {
    console.log('Connected to server');
    socketRef.emit('identify', { id: 'Umeko', guilds: Array.from(bot.guilds.cache.keys()) });
}

// On disconnect from the server
function onDisconnect() {
    console.log('Disconnected from server');
}


// handle an event from the server to invalidate local date( make the data dirty so we pull a new version from the db)
function onUpdate({ guild, field, value }) {
    if (perGuildData.get(guild) !== undefined) {
        if (perGuildData.get(guild)[field] !== undefined) {
            perGuildData.get(guild)[field] = value;
        }
    }
}

function onGetGuild(guildId) {
    socketRef.emit('guildData', bot.guilds.cache.get(guildId));
}

// array of possible events (done like this for heatsync reloading)
const newSocketEvents = [
    { id: 'connect', event: onConnect },
    { id: 'disconnect', event: onDisconnect },
    { id: 'update', event: onUpdate },
    { id: 'getGuild', event: onGetGuild }
]


if (socket === undefined) {

    const newSocket = io('https://rel-js-server.oyintareebelo.repl.co');

    newSocket.emit('identify', { id: 'Umeko', guilds: Array.from(bot.guilds.cache.keys()) });

    console.log('Socket connection created');
    
    Object.assign(ps, { socket: newSocket });

    socketRef = newSocket;

    newSocketEvents.forEach(function (socketEvent, index) {
        try {
            newSocket.on(socketEvent.id, socketEvent.event);
        } catch (error) {
            logError(`Error binding event "${socketEvent.id}" to socket`,error);
        }
    });

}



console.log("\x1b[32m",'Socket Module Loaded\x1b[0m');

if (modulesLastReloadTime.socket !== undefined) {

    if (socketRef) {
        if (socketEvents !== undefined) {

            socketEvents.forEach(function (socketEvent, index) {
                try {
                    socketRef.removeListener(socketEvent.id, socketEvent.event);
                } catch (error) {
                    logError(`Error unbinding event "${socketEvent.id}" to socket`,error);
                }
            });

        }

        newSocketEvents.forEach(function (socketEvent, index) {
            try {
                socketRef.on(socketEvent.id, socketEvent.event);
            } catch (error) {
                logError(`Error binding event "${socketEvent.id}" to socket`,error);
            }
        });

        Object.assign(ps, { socketEvents: newSocketEvents });
    }

}

modulesLastReloadTime.socket = bot.uptime;
