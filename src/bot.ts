process.chdir(__dirname);

import "./bus";

import { data, Client as ClusterClient } from "discord-hybrid-sharding";

import { Client, Intents, PartialTypes } from "discord.js";
import path from "path";

const fs = require("fs");

const { defaultPrefix, defaultPrimaryColor } = bus.sync.require(
  path.join(process.cwd(), "./config.json")
) as typeof import("./config.json");

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
  shards: data.SHARD_LIST,
  shardCount: data.TOTAL_SHARDS,

  partials: ["MESSAGE", "CHANNEL"] as PartialTypes[],
};

// Setup settings and configs
bus.bot = new Client(clientOptions);

bus.cluster = new ClusterClient(bus.bot); //Init the Client & So we can also access broadcastEval...

bus.sync.require("./events");

bus.bot.login(process.env.DISCORD_BOT_TOKEN);
