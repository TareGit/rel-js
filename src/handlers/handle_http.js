const ps = require(`${process.cwd()}/passthrough`);

const { loadCommands } = ps.sync.require('./handle_commands');

const fs = require('fs');

const { io } = require("socket.io-client");

// On connect to the server
function onConnect() {
    console.log('Connected to server');
    ps.socket.emit('identify', 'REL');
    console.log('Sent identity to server');
}

// On disconnect from the server
function onDisconnect() {
    console.log('Disconnected from server');
}


// handle an event from the server to invalidate local date( make the data dirty so we pull a new version from the db)
function onInvalidate(payload) {
    console.log(`Payload recieved`);
    console.log(payload);
}

// array of possible events (done like this for heatsync reloading)
const socketEvents = [
    { id: 'connect', event: onConnect },
    { id: 'disconnect', event: onDisconnect },
    { id: 'invalidate', event: onInvalidate }
]

/*
if (ps.socket === undefined) {
    const socket = io('http://localhost:3000/');
    console.log('Socket connection created');
    ps.socket = socket;
}*/

if (ps.socket) {
    if (ps.socket.currentEvents) {
        const previousEvents = ps.socket.currentEvents;

        previousEvents.forEach(function (socketEvent, index) {
            try {
                ps.socket.removeListener(socketEvent.id, socketEvent.event);
            } catch (error) {
                console.log(error);
            }
        });

    }

    socketEvents.forEach(function (socketEvent, index) {
        try {
            ps.socket.on(socketEvent.id, socketEvent.event);
        } catch (error) {
            console.log(error);
        }
    });

    ps.socket.currentEvents = socketEvents;
}









