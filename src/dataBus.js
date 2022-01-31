const Heatsync = require("heatsync");
const axios = require("axios");

// ram, Never reload
const dataBus = {
    sync : new Heatsync(),
    modulesLastReloadTime : {},
    db : axios.create({
        baseURL: process.env.DB_API,
        headers: {
            'x-api-key': process.env.DB_API_TOKEN
        }
    })
}

module.exports = dataBus;