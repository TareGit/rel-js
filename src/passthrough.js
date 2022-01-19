const Heatsync = require("heatsync");
const axios = require("axios");

// ram, Never reload
const passthrough = {
    sync : new Heatsync(),
    perGuildSettings : new Map(),
    colors: new Map(),
    prefixes: new Map(),
    queues : new Map(),
    commands : new Map(),
    commandsPaths : new Map(),
    modulesLastReloadTime : {},
    disabledCategories : [],
    perGuildLeveling : new Map(),
    db : axios.create({
        baseURL: process.env.DB_API,
        headers: {
            'x-umeko-token': process.env.DB_API_TOKEN
        }
    })
}

module.exports = passthrough;