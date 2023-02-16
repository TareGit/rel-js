process.chdir(__dirname);

import "@core/bus";
import { getInfo, ClusterClient } from "discord-hybrid-sharding";
import { Client, Intents, PartialTypes } from "discord.js";
import { PluginsModule, CommandsModule, DatabaseModule, BrowserModule } from "@modules/exports";
import Sync from "heatsync";
import { log } from "@core/utils";

// bot Intents
const clientOptions = {
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  shards: getInfo().SHARD_LIST,
  shardCount: getInfo().TOTAL_SHARDS,

  partials: ["MESSAGE", "CHANNEL"] as PartialTypes[],
};

const bot = new Client(clientOptions);
const cluster = new ClusterClient(bot);

bot.on('ready', async (client) => {
  log("Bot Logged in")

  global.bus = {
    moduleReloadLog: new Map(),
    disabledCategories: [],
    sync: new Sync(),
    database: new DatabaseModule(client),
    plugins: new PluginsModule(client),
    commands: new CommandsModule(client),
    browser: new BrowserModule(client),
    bot: bot,
    cluster: cluster,
    loadedSyncFiles: [],
    dependencies: new Map()
  };

  log("Bus initialized")
  log("loading modules")

  await bus.database.load();
  await bus.commands.load();
  await bus.browser.load();
  await bus.plugins.load();

  await bus.commands.uploadCommands(process.env.DEBUG_GUILD) // Upload comands

  bus.sync.events.on("error", (err) => log("Sync Error", err));
})

bot.on('error', (err) => log("Bot Error", err))

bot.login(process.env.DISCORD_BOT_TOKEN);
log("Logging In")
