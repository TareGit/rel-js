import Sync from "heatsync";
import axios from "axios";
import Queue from "./classes/Queue";

// ram, Never reload
const dataBus: IDataBus = {
    guildSettings: new Map<string, IGuildSettings>(),
    userSettings: new Map<string, IGuildSettings>(),
    queues: new Map<string, Queue>(),
    commandsPaths: new Map<string, IGuildSettings>(),
    guildLeveling: new Map<string, IGuildSettings>(),
    slashCommands: new Map<string, IUmekoSlashCommand>(),
    messageCommands: new Map<string, IUmekoMessageCommand>(),
    userCommands: new Map<string, IUmekoUserCommand>(),
    moduleReloadLog: new Map<string, string>(),
    lavacordManager: null,
    guildsPendingUpdate: [],
    usersPendingUpdate: [],
    disabledCategories: [],
    sync: new Sync(),
    db: axios.create({
        baseURL: process.env.DB_API,
        headers: {
            'x-api-key': process.env.DB_API_TOKEN
        }
    }),
}

module.exports = dataBus;
