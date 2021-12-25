
// ram, Never reload
const passthrough = {
    perGuildData : new Map(),
    colors: new Map(),
    prefixes: new Map(),
    queues : new Map(),
    commands : new Map(),
    commandsPaths : new Map(),
    modulesLastReloadTime : {},
    disabledCategories : []
}

module.exports = passthrough;