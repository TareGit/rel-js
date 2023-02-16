import path from "path";
import { existsSync } from "fs";
import * as fs from "fs/promises";
import { ClusterManager } from "discord-hybrid-sharding";
import { log } from '@core/utils'
try {
  process.env = require("../secretes.json");
} catch (error) {
  throw new Error("Missing Secretes.json");
}

if (process.argv.includes("--debug")) {
  process.env.DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN_ALPHA;
  process.env.DB_API = process.env.DB_API_DEBUG;
  process.env.SERVER_API = process.env.SERVER_API_DEBUG;
  process.env.CLUSTER_API = process.env.CLUSTER_API_DEBUG;
  process.env.DEBUG_GUILD = "919021496914018346"
}

if (!existsSync(path.join(process.cwd(), "puppeter")))
  fs.mkdir(path.join(process.cwd(), "puppeter"));

const manager = new ClusterManager(path.join(__dirname, 'core', 'bot.js'), {
  totalShards: 2,
  shardsPerClusters: 3,
  mode: "process",
  token: process.env.DISCORD_BOT_TOKEN,
});

manager.on("clusterCreate", (cluster) =>
  log(`Launched Cluster ${cluster.id}`)
);

manager.spawn({ timeout: -1 });

global.ClusterManager = manager

const webServer = require("./core/server");

export { };
