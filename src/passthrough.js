
// ram, Never reload
const passthrough = {
    perGuildData : new Map(),
    pColors: new Map(),
    prefixes: new Map(),
    queues : new Map(),
    commands : new Map(),
    commandsPaths : new Map(),
    modulesLastReloadTime : {}
}

module.exports = passthrough;