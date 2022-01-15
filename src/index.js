
const { existsSync } = require('fs');
const fs = require('fs').promises;

const Cluster = require("discord-hybrid-sharding");
const utils = require(`./utils`);

try {
   process.env = require('../secretes.json');
} catch (error) {
   throw new Error('Missing Secretes.json');
}

if(process.argv.includes('debug'))
{
   process.env.DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN_ALPHA;
   process.env.DB_API = process.env.DB_API_DEBUG;
} 

if(!existsSync(`${process.cwd()}/puppeter`)) fs.mkdir(`${process.cwd()}/puppeter`);

const manager = new Cluster.Manager(`${__dirname}/bot.js`,{
                                       totalShards: 'auto',
                                       shardsPerClusters: 3, 
                                       mode: "process" ,
                                       token: process.env.DISCORD_BOT_TOKEN,
                                    });

manager.on('clusterCreate', cluster => utils.log(`Launched Cluster ${cluster.id}`));

manager.spawn({timeout: -1});
