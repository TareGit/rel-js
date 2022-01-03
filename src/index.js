const { ShardingManager } = require('discord.js');

process.chdir(__dirname);

const Heatsync = require("heatsync");
const sync = new Heatsync();

const utils = sync.require(`./utils`);
process.env = sync.require('./secretes/secretes.json');

process.env.CURRENT_BOT_TOKEN = process.argv.includes('alpha') ? process.env.DISCORD_BOT_TOKEN_ALPHA : process.env.DISCORD_BOT_TOKEN;

const manager = new ShardingManager('./bot.js', { token: process.env.CURRENT_BOT_TOKEN });

manager.on('shardCreate', shard => log(`Launched shard ${shard.id}`));

manager.spawn();