import './resolver';
import './paths';
import '@core/console';
import path from 'path';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import { ClusterManager } from 'discord-hybrid-sharding';
try {
	process.env = require('../secretes.json');
} catch (error: any) {
	throw new Error('Missing Secretes.json');
}

if (process.argv.includes('--debug')) {
	process.env.DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN_ALPHA;
	process.env.DB_API = process.env.DB_API_DEBUG;
	process.env.SERVER_API = process.env.SERVER_API_DEBUG;
	process.env.CLUSTER_API = process.env.CLUSTER_API_DEBUG;
	process.env.DEBUG_GUILD = '669640893745201168'; //'451879265487683587'; //'919021496914018346';
}

if (!existsSync(path.join(process.cwd(), 'puppeter')))
	fs.mkdir(path.join(process.cwd(), 'puppeter'));

const manager = new ClusterManager(path.join(__dirname, 'core', 'bot.js'), {
	totalShards: 2,
	shardsPerClusters: 3,
	mode: 'process',
	token: process.env.DISCORD_BOT_TOKEN,
});

manager.on('clusterCreate', (cluster) =>
	console.error(`Launched Cluster ${cluster.id}`)
);

manager.spawn({ timeout: -1 });

global.ClusterManager = manager;

import './core/server';

export {};
