import { Loadable } from '@core/base';
import { buildBasicEmbed } from '@core/utils';
import { CommandContext } from '@modules/exports';
import { BotPlugin } from '@modules/plugins';
import {
	Client,
	GuildMember,
	TextBasedChannel,
	VoiceBasedChannel,
} from 'discord.js';
import {
	LavalinkEvent,
	Manager,
	Player,
	VoiceServerUpdate,
	VoiceStateUpdate,
} from 'lavacord';

export const enum ESourceType {
	SPOTIFY,
	YOUTUBE,
	YOUTUBE_PLAYLIST,
}

export const enum ELoopType {
	NONE = 'off',
	SONG = 'song',
	QUEUE = 'queue',
}

export const enum EQueueSource {
	COMMAND = 0,
	QUEUE = 1,
	SAVED_QUEUE = 2,
}

export interface ITrack {
	id: string;
	track: string;
	title: string;
	uri: string;
	length: number;
	requester: GuildMember;
	groupURL?: string;
}

export interface ISavedTrack {
	member: string;
	uri: string;
}

export interface ISavedQueue {
	identifier?: string;
	id: string;
	channel: string;
	voice: string;
	songs: ISavedTrack[];
	loopType: ELoopType;
	volume: number;
}

export interface ILoadedQueue {
	identifier?: string;
	id: string;
	channel: TextBasedChannel;
	voice: VoiceBasedChannel;
	songs: ITrack[];
	loopType: ELoopType;
	volume: number;
}

class Queue extends Loadable {
	id: string;
	channel?: TextBasedChannel;
	voice?: VoiceBasedChannel;
	player?: Player;
	tracks: string[] = [];
	loopType: ELoopType = ELoopType.NONE;
	volume: number = 0.5;
	currentTrack?: string;
	queueTimeout?: NodeJS.Timeout;
	plugin: MusicPlugin;
	queue: ITrack[] = [];
	onPlayerEndCallback!: (data: LavalinkEvent) => void;
	constructor(plugin: MusicPlugin, player?: Player) {
		super();
		this.plugin = plugin;
		this.player = player;
		this.id = '';
	}
	async join(guildId: string, channelId: string) {
		this.player = await this.plugin.manager.join({
			guild: guildId, // Guild id
			channel: channelId, // Channel id
			node: '1', // lavalink node id, based on array of nodes
		});
		this.onPlayerEndCallback = this.onPlayerEnd.bind(this);
		this.player.on('end', this.onPlayerEndCallback);
		this.id = guildId;
		this.load();
	}

	onPlayerEnd(data: LavalinkEvent) {
		if (data.reason === 'REPLACED') return;
	}

	async addTracks(...tracks: ITrack[]) {}
}

export default class MusicPlugin extends BotPlugin {
	static GROUP = 'music';
	queues: Map<string, Queue> = new Map();
	manager: Manager;
	onVoiceServerUpdateCallback!: (data: VoiceServerUpdate) => Promise<boolean>;
	onVoiceStateUpdateCallback!: (data: VoiceStateUpdate) => Promise<boolean>;
	onGuildCreateCallback!: (data: unknown) => Promise<void>;
	constructor(dir: string) {
		super(dir);
		this.id = 'music';
		this.manager = new Manager(
			[
				{
					id: '1',
					host: 'localhost',
					port: 2333,
					password: process.env.LAVALINK_PASSWORD,
				},
			],
			{
				user: this.bot.user?.id || '',
				shards: this.bot.options.shardCount,
				send: (packet) => {
					const guild = this.bot.guilds.cache.get(packet.d.guild_id);

					return guild?.shard.send(packet);
				},
			}
		);
	}

	override async onLoad(): Promise<void> {
		await this.manager.connect();
		this.manager.on('error', (error, node) => {
			console.error('Lavacord Error On Node', node, '\n', error);
		});
	}

	getSourceType(source: string): ESourceType {
		return ESourceType.YOUTUBE;
	}

	async getQueue(ctx: CommandContext) {
		if (!ctx.ctx.guildId) return null;

		if (this.queues.has(ctx.ctx.guildId)) {
			return this.queues.get(ctx.ctx.guildId)!;
		}

		const newQueue = new Queue(this);

		await newQueue.join(ctx.ctx.guildId, ctx.ctx.channelId);

		this.queues.set(ctx.ctx.guildId, newQueue);

		return newQueue;
	}

	async playSource(ctx: CommandContext, source: string) {
		await ctx.deferReply();

		const queue = await this.getQueue(ctx);

		if (!queue) {
			ctx.reply({
				embeds: [
					await buildBasicEmbed(ctx, {
						text: 'How have you done this ?',
					}),
				],
			});
			return;
		}

		const sourceType = this.getSourceType(source);

		const tracksToAdd: ITrack[] = [];

		switch (sourceType) {
			case ESourceType.SPOTIFY: {
			}
			case ESourceType.YOUTUBE: {
			}
			case ESourceType.YOUTUBE_PLAYLIST: {
			}
		}

		if (tracksToAdd.length === 0) {
			ctx.editReply({
				embeds: [
					await buildBasicEmbed(ctx, {
						text: 'TBH Idk what that link even is ¯\\_(ツ)_/¯',
					}),
				],
			});
		} else {
			if (queue.queue.length > 0) {
				ctx.editReply({
					embeds: [
						await buildBasicEmbed(ctx, {
							text: 'Tracks Added to Queue',
						}),
					],
				});
			}

			queue.addTracks(...tracksToAdd);
		}
	}

	override async onDestroy(): Promise<void> {}
}
