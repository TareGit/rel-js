import '../resolver';
import '../paths';
import './console';
import '@core/bus';
import { getInfo, ClusterClient } from 'discord-hybrid-sharding';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import {
	PluginsModule,
	CommandsModule,
	DatabaseModule,
} from '@modules/exports';
import Sync from 'heatsync';
import { cleanup } from '../cleanup';

// bot Intents
const clientOptions = {
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildVoiceStates,
	],
	shards: getInfo().SHARD_LIST,
	shardCount: getInfo().TOTAL_SHARDS,

	partials: [Partials.Message, Partials.Channel],
};

const bot = new Client(clientOptions);
const cluster = new ClusterClient(bot);

bot.on('ready', async (client) => {
	console.info('Bot Logged in');

	global.bus = {
		moduleReloadLog: new Map(),
		disabledCategories: [],
		sync: new Sync(),
		database: new DatabaseModule(),
		plugins: new PluginsModule(),
		commands: new CommandsModule(),
		bot: bot,
		cluster: cluster,
		loadedSyncFiles: [],
		dependencies: new Map(),
	};

	console.info('Bus initialized');
	console.info('loading modules');

	await bus.database.load();
	await bus.commands.load();
	await bus.plugins.load();

	await bus.commands.uploadCommands(process.env.DEBUG_GUILD); // Upload comands

	bus.sync.events.on('error', (err) => console.error('Sync Error', err));
});

cleanup(async () => {
	console.info('Shutting down');
	// await bus.commands.destroy();
	// await bus.database.destroy();

	// await bus.plugins.destroy();
});

// process.on('beforeExit', async (code) => {
// 	// Perform async cleanup actions here
// 	console.log('BEFORE EXIT CALLED');

// 	console.log('Cleanup completed.');
// });

bot.on('error', (err) => console.error('Bot Error', err));

bot.login(process.env.DISCORD_BOT_TOKEN);
console.info('Logging In');
