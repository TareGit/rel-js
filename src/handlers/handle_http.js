const ps = require(`${process.cwd()}/passthrough.js`);
const { sync, bot, socket, socketEvents, modulesLastReloadTime, perGuildSettings } = require(`${process.cwd()}/passthrough.js`);

const fs = require('fs');

const { io } = require("socket.io-client");

let socketRef = socket;

// On connect to the server
function onConnect() {
    log('Connected to Main Server');
    socketRef.emit('identify', { id: 'Umeko', guilds: Array.from(bot.guilds.cache.keys()) });
}

// On disconnect from the server
function onDisconnect() {
    log('Disconnected from Main Server');
}


// handle an event from the server to update local data
function onUpdate({ guild, update }) {
    if (perGuildSettings.get(guild) !== undefined) {
        perGuildSettings.set(guild,update)
    }
}

function onGetGuild(guildId) {
    socketRef.emit('guild', bot.guilds.cache.get(guildId));
}

function onGetGuildSettings(guildId) {
    socketRef.emit('guildSettings', perGuildSettings.get(guildId));
}

// array of possible events (done like this for heatsync reloading)
const newSocketEvents = [
    { id: 'connect', event: onConnect },
    { id: 'disconnect', event: onDisconnect },
    { id: 'update', event: onUpdate },
    { id: 'getGuild', event: onGetGuild },
    { id: 'getGuildSettings', event: onGetGuildSettings }
]


if (socket === undefined) {

    const newSocket = io(process.argv.includes('alpha') ? 'http://localhost:8080' : 'https://rel-js-server.oyintareebelo.repl.co');

    newSocket.emit('identify', { id: 'Umeko', guilds: Array.from(bot.guilds.cache.keys()) });

    log('Socket connection created');
    
    Object.assign(ps, { socket: newSocket });

    socketRef = newSocket;

    newSocketEvents.forEach(function (socketEvent, index) {
        try {
            newSocket.on(socketEvent.id, socketEvent.event);
        } catch (error) {
            log(`\x1b[31mError binding event "${socketEvent.id}" to socket\x1b[0m\n`,error);
        }
    });

}





if (modulesLastReloadTime.socket !== undefined) {

    if (socketRef) {
        if (socketEvents !== undefined) {

            socketEvents.forEach(function (socketEvent, index) {
                try {
                    socketRef.removeListener(socketEvent.id, socketEvent.event);
                } catch (error) {
                    log(`\x1b[31mError unbinding event "${socketEvent.id}" to socket\x1b[0m\n`,error);
                }
            });

        }

        newSocketEvents.forEach(function (socketEvent, index) {
            try {
                socketRef.on(socketEvent.id, socketEvent.event);
            } catch (error) {
                log(`\x1b[31mError binding event "${socketEvent.id}" to socket\x1b[0m\n`,error);
            }
        });

        Object.assign(ps, { socketEvents: newSocketEvents });
    }

    log('\x1b[32mSocket Module Reloaded\x1b[0m');

}
else
{
    log('\x1b[32mSocket Module Loaded\x1b[0m');
}

if(bot)
{
    modulesLastReloadTime.socket = bot.uptime;
}

