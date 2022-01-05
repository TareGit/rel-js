const Heatsync = require("heatsync");

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
    perGuildLeveling : new Map()
}

module.exports = passthrough;