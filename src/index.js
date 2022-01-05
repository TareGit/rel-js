
const Cluster = require("discord-hybrid-sharding");
const utils = require(`./utils`);
process.env = require('./secretes/secretes.json');
if(process.argv.includes('debug'))
{
   process.env.DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN_ALPHA;
   process.env.DB_API = process.env.DB_API_DEBUG;
} 


const manager = new Cluster.Manager(`${__dirname}/bot.js`,{
                                       totalShards: 'auto',
                                       shardsPerClusters: 3, 
                                       mode: "process" ,
                                       token: process.env.DISCORD_BOT_TOKEN,
                                    });

manager.on('clusterCreate', cluster => utils.log(`Launched Cluster ${cluster.id}`));

manager.spawn({timeout: -1});
