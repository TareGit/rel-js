import Sync from "heatsync";
import axios from "axios";
import {
  IGuildSettings,
  IUmekoSlashCommand,
  IUmekoContextMenuCommand,
  IUmekoUserCommand,
} from "./types";

global.bus = {
  guildSettings: new Map(),
  userSettings: new Map(),
  commandsPaths: new Map(),
  guildLeveling: new Map(),
  slashCommands: new Map(),
  contextMenuCommands: new Map(),
  userCommands: new Map(),
  moduleReloadLog: new Map(),
  guildsPendingUpdate: [],
  usersPendingUpdate: [],
  levelingDataPendingUpload: new Map(),
  disabledCategories: [],
  sync: new Sync(),
  db: axios.create({
    baseURL: process.env.DB_API,
    headers: {
      "x-api-key": process.env.DB_API_TOKEN || "",
    },
  }),
  bot: null,
  cluster: null,
  lavacordManager: null,
  boundBotEvents: new Map(),
  manager: null,
  queues: new Map(),
  loadedSyncFiles: [],
  dependencies: new Map()
};

bus.sync.events.on("error", console.log);

export { };
