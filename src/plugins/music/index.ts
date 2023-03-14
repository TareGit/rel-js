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
import { LavalinkEvent, Manager, Player } from 'lavacord';

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
	constructor(plugin: MusicPlugin, player?: Player) {
		super();
		this.plugin = plugin;
		this.player = player;
	}

	async join(guildId: string, channelId: string) {
		this.player = await this.plugin.lavacord.join({
			guild: guildId, // Guild id
			channel: channelId, // Channel id
			node: '1', // lavalink node id, based on array of nodes
		});

		this.bindEvent(this.player as any, 'end', this.onPlayerEnd.bind(this));
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
	lavacord: Manager;
	constructor(bot: Client, dir: string) {
		super(bot, dir);
		this.id = 'music';
		this.lavacord = new Manager(
			[
				{
					id: '1',
					host: 'localhost',
					port: 2333,
					password: process.env.LAVALINK_PASSWORD,
				},
			],
			{
				user: bot.user?.id || '',
				shards: bot.options.shardCount,
				send: (packet) => {
					const guild = bot.guilds.cache.get(packet.d.guild_id);

					return guild?.shard.send(packet);
				},
			}
		);
	}

	override async onLoad(): Promise<void> {
		await this.lavacord.connect();
		this.bindEvents([
			{
				target: this.bot,
				event: 'VOICE_SERVER_UPDATE',
				callback: this.lavacord.voiceServerUpdate.bind(this.lavacord),
			},
			{
				target: this.bot,
				event: 'VOICE_STATE_UPDATE',
				callback: this.lavacord.voiceStateUpdate.bind(this.lavacord),
			},
			{
				target: this.bot,
				event: 'GUILD_CREATE',
				callback: async (data) => {
					for (const state of data.voice_states)
						await this.lavacord.voiceStateUpdate({
							...state,
							guild_id: data.id,
						});
				},
			},
		]);
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
