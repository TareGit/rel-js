import { BotError, Loadable } from '@core/base';
import { buildBasicEmbed, getMemeberAvatarUrl } from '@core/utils';
import { CommandContext } from '@modules/exports';
import { BotPlugin } from '@modules/plugins';
import {
	ColorResolvable,
	GuildMember,
	GuildTextBasedChannel,
	EmbedBuilder,
	TextBasedChannel,
	VoiceBasedChannel,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Message,
	GatewayDispatchEvents,
	InteractionCollector,
	ButtonInteraction,
} from 'discord.js';
import {
	LavalinkEvent,
	Manager,
	Player,
	VoiceServerUpdate,
	VoiceStateUpdate,
	Rest as LavacordRest,
	LoadType,
} from 'lavacord';
import { leftArrowEmoji, rightArrowEmoji } from '../../config.json';
export const enum ESourceType {
	SPOTIFY,
	YOUTUBE,
	YOUTUBE_PLAYLIST,
	SEARCH,
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
	track: string;
	title: string;
	url: string;
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

export type InteractionIds = {
	queue: string;
	pause: string;
	play: string;
	skip: string;
	stop: string;
};

class Queue extends Loadable {
	id: string;
	channel?: GuildTextBasedChannel;
	voice?: VoiceBasedChannel;
	player?: Player;
	loopType: ELoopType = ELoopType.NONE;
	maxVolume = 150;
	volumeExp = 0.15;
	currentTrack?: ITrack;
	queueTimeout?: NodeJS.Timeout;
	plugin: MusicPlugin;
	recents: ITrack[] = [];
	queue: ITrack[] = [];
	currentNowPlayingMessage?: Message<true>;
	currentNowPlayingInteractionCollector?: InteractionCollector<ButtonInteraction>;

	get volume() {
		return this.volumeExp * this.maxVolume;
	}
	onPlayerEndCallback!: (data: LavalinkEvent) => Promise<void>;
	constructor(plugin: MusicPlugin, player?: Player) {
		super();
		this.plugin = plugin;
		this.player = player;
		this.id = '';
	}

	async join(guildId: string, voiceChannelId: string, textChannelId: string) {
		console.info('Joining Channel', guildId, voiceChannelId);
		this.player = await this.plugin.manager.join({
			guild: guildId, // Guild id
			channel: voiceChannelId, // Channel id
			node: '1', // lavalink node id, based on array of nodes
		});

		this.onPlayerEndCallback = this.onPlayerEnd.bind(this);

		this.player.on('end', this.onPlayerEndCallback);
		this.player.on('error', console.error);

		this.id = guildId;

		console.info('Player created');
		const textChannel = (await this.bot.channels.fetch(
			textChannelId,
			{}
		)) as GuildTextBasedChannel | null;

		if (textChannel) {
			this.channel = textChannel;
		}

		this.load();
	}

	async playPrevious() {
		const trackToPlay = this.recents.pop();
		if (trackToPlay) {
			if (this.currentTrack) {
				this.queue.unshift(this.currentTrack);
			}
			await this.disableActiveNowPlayingEmbed();
			this.playTrack(trackToPlay);
		}
	}
	async playNext() {
		await this.disableActiveNowPlayingEmbed();
		this.clearCurrentTrack();
		const trackToPlay = this.queue.shift();
		if (trackToPlay) {
			this.playTrack(trackToPlay);
		}
	}

	async disableActiveNowPlayingEmbed() {
		if (this.currentNowPlayingInteractionCollector) {
			this.currentNowPlayingInteractionCollector.stop('Done');
		}

		if (this.currentNowPlayingMessage) {
			await this.currentNowPlayingMessage.delete();
		}

		this.currentNowPlayingInteractionCollector = undefined;
		this.currentNowPlayingMessage = undefined;
	}

	buildNowPlayingActionRow() {
		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(
					this.player?.paused
						? this.nowPlayingInteractionIds.play
						: this.nowPlayingInteractionIds.pause
				)
				.setLabel(this.player?.paused ? 'Play' : 'Pause')
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(this.nowPlayingInteractionIds.previous)
				.setLabel('Previous')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(this.recents.length === 0),
			new ButtonBuilder()
				.setCustomId(this.nowPlayingInteractionIds.skip)
				.setLabel('Skip')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(this.queue.length === 0),
			new ButtonBuilder()
				.setCustomId(this.nowPlayingInteractionIds.queue)
				.setLabel('Show Queue')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId(this.nowPlayingInteractionIds.stop)
				.setLabel('Stop')
				.setStyle(ButtonStyle.Danger)
		);
	}

	// buildNowPlayingActionRow() {
	// 	return new ActionRowBuilder<ButtonBuilder>().addComponents(
	// 		new ButtonBuilder()
	// 			.setCustomId(
	// 				this.player?.paused
	// 					? this.interactionIds.play
	// 					: this.interactionIds.pause
	// 			)
	// 			.setLabel(this.player?.paused ? 'Play' : 'Pause')
	// 			.setStyle(ButtonStyle.Success),
	// 		new ButtonBuilder()
	// 			.setCustomId(this.interactionIds.skip)
	// 			.setLabel('Skip')
	// 			.setStyle(ButtonStyle.Primary)
	// 			.setDisabled(this.queue.length === 0),
	// 		new ButtonBuilder()
	// 			.setCustomId(this.interactionIds.stop)
	// 			.setLabel('Stop')
	// 			.setStyle(ButtonStyle.Danger),
	// 		new ButtonBuilder()
	// 			.setCustomId(this.interactionIds.queue)
	// 			.setLabel('Show Queue')
	// 			.setStyle(ButtonStyle.Secondary)
	// 	);
	// }

	async makeQueueCollector(uniqueId: string, message: Message<true>) {
		const collector = new InteractionCollector<ButtonInteraction>(this.bot, {
			message: message,
			idle: 30,
		});

		const interactionIds = this.queueInteractionIds(uniqueId);
		collector.on('collect', async (interaction) => {
			switch (interaction.customId) {
				case interactionIds.next:
					await interaction.deferUpdate();

					await interaction.editReply({
						embeds: [await this.buildQueue()],
						components: [this.buildQueueActionRow(uniqueId)],
					});
					break;
				case interactionIds.previous:
					await interaction.deferUpdate();

					await interaction.editReply({
						embeds: [await this.buildQueue()],
						components: [this.buildQueueActionRow(uniqueId)],
					});
					break;

				default:
					break;
			}
		});
	}
	async buildQueue() {
		let queuePage = 0;
		let itemsPerPage = 10;

		const queueCopy = [...this.queue];
		const embed = new EmbedBuilder();

		embed.setColor(
			(await bus.database.getGuild(this.id)).color as ColorResolvable
		);

		if (this.queue.length === 0) {
			return embed.setAuthor({
				name: 'There are no more tracks',
				iconURL: this.bot.user?.avatarURL() ?? undefined,
			});
		} else {
			embed.setAuthor({
				name: `${this.channel?.guild.name ?? 'unknown'}'s Queue`,
				iconURL: this.bot.user?.avatarURL() ?? undefined,
			});
		}

		embed.setFields(
			this.queue
				.slice(queuePage * itemsPerPage, (queuePage + 1) * itemsPerPage)
				.map((a) => {
					return {
						name: a.title,
						value: a.requester.displayName,
					};
				})
		);

		return embed;
	}

	buildQueueActionRow(uniqueId: string) {
		const ids = this.queueInteractionIds(uniqueId);

		return new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(ids.previous)
				.setStyle(ButtonStyle.Primary)
				.setEmoji(leftArrowEmoji),
			new ButtonBuilder()
				.setCustomId(ids.next)
				.setStyle(ButtonStyle.Primary)
				.setEmoji(rightArrowEmoji)
		);
	}

	async skip() {
		await this.player?.stop();
	}

	get nowPlayingInteractionIds() {
		return {
			queue: `${this.channel?.guildId}-music-queue`,
			pause: `${this.channel?.guildId}-music-pause`,
			skip: `${this.channel?.guildId}-music-skip`,
			stop: `${this.channel?.guildId}-music-stop`,
			play: `${this.channel?.guildId}-music-play`,
			previous: `${this.channel?.guildId}-music-previous`,
		};
	}

	queueInteractionIds(uniqueId: string) {
		return {
			next: `${uniqueId}-music-queue-next`,
			previous: `${uniqueId}-music-queue-previous`,
		};
	}

	async buildNowEmbed() {
		const embed = new EmbedBuilder();

		if (!this.currentTrack) {
			return embed;
		}

		const iconUrl =
			this.currentTrack.requester.avatarURL() ??
			this.currentTrack.requester.user.avatarURL() ??
			undefined;

		embed.setAuthor({
			name: `${this.currentTrack?.title}`,
			iconURL: iconUrl,
			url: this.currentTrack.url
		});
		embed.setColor(
			(await bus.database.getGuild(this.channel?.guildId))
				.color as ColorResolvable
		);

		return embed;
	}

	async createNowPlayingEmbed(ctx?: CommandContext) {
		await this.disableActiveNowPlayingEmbed();

		if (!this.currentTrack || !this.channel) {
			return;
		}

		if (ctx) {
			this.currentNowPlayingMessage = (await ctx.asSlashContext.editReply({
				embeds: [await this.buildNowEmbed()],
				components: [this.buildNowPlayingActionRow()],
			})) as Message<true>;
			this.channel = ctx.asSlashContext.channel as GuildTextBasedChannel;
		} else {
			this.currentNowPlayingMessage = await this.channel.send({
				embeds: [await this.buildNowEmbed()],
				components: [this.buildNowPlayingActionRow()],
			});
		}

		this.currentNowPlayingInteractionCollector =
			new InteractionCollector<ButtonInteraction>(this.bot, {
				message: this.currentNowPlayingMessage,
			});

		this.currentNowPlayingInteractionCollector.on(
			'collect',
			async (interaction) => {
				switch (interaction.customId) {
					case this.nowPlayingInteractionIds.pause:
						await interaction.deferUpdate();
						await this.player?.pause(true);
						await interaction.editReply({
							embeds: [await this.buildNowEmbed()],
							components: [this.buildNowPlayingActionRow()],
						});
						break;
					case this.nowPlayingInteractionIds.play:
						await interaction.deferUpdate();
						await this.player?.resume();
						await interaction.editReply({
							embeds: [await this.buildNowEmbed()],
							components: [this.buildNowPlayingActionRow()],
						});
						break;
					case this.nowPlayingInteractionIds.queue:
						await interaction.deferReply({
							ephemeral: true,
						});

						await interaction.editReply({
							embeds: [await this.buildQueue()],
							components: [this.buildQueueActionRow(interaction.id)],
						});
						break;
					case this.nowPlayingInteractionIds.previous:
						await interaction.deferUpdate();
						await interaction.editReply({
							embeds: [await this.buildNowEmbed()],
							components: [],
						});
						await this.playPrevious();
						break;
					case this.nowPlayingInteractionIds.skip:
						await interaction.deferUpdate();
						await interaction.editReply({
							embeds: [await this.buildNowEmbed()],
							components: [this.buildNowPlayingActionRow()],
						});
						await this.skip();
						break;
					case this.nowPlayingInteractionIds.stop:
						await interaction.deferUpdate();
						await interaction.editReply({
							embeds: [await this.buildNowEmbed()],
							components: [this.buildNowPlayingActionRow()],
						});
						await this.stop();
						break;

					default:
						break;
				}
			}
		);
	}

	async updateEmbed() {
		if (this.currentNowPlayingMessage) {
			this.currentNowPlayingMessage = await this.currentNowPlayingMessage.edit({
				embeds: [await this.buildNowEmbed()],
				components: [this.buildNowPlayingActionRow()],
			});
		}
	}

	async playTrack(track: ITrack) {
		this.player?.play(track.track, {
			volume: this.volume,
		});

		this.currentTrack = track;

		await this.createNowPlayingEmbed();
	}

	async setVolume(value: number) {
		if (!this.player) {
			return false;
		}

		this.volumeExp = Math.max(Math.min(100, value), 0.01) / 100;
		return await this.player.volume(this.volume);
	}

	clearCurrentTrack() {
		if (this.currentTrack) {
			this.recents.push(this.currentTrack);
		}
		this.currentTrack = undefined;
	}
	async onPlayerEnd(data: LavalinkEvent) {
		if (data.reason === 'REPLACED') return;

		if (this.queue.length > 0) {
			this.playNext();
		} else {
			await this.disableActiveNowPlayingEmbed();
		}
	}

	async addTracks(...tracks: ITrack[]) {
		this.queue = [...this.queue, ...tracks];

		if (!this.currentTrack) {
			await this.playNext();
		}

		if (this.currentNowPlayingMessage) {
			await this.currentNowPlayingMessage.edit({
				embeds: [await this.buildNowEmbed()],
				components: [this.buildNowPlayingActionRow()],
			});
		}
	}

	async sendLeaveMessage() {
		const embed = new EmbedBuilder();

		embed.setColor(
			(await bus.database.getGuild(this.id)).color as ColorResolvable
		);

		embed.setAuthor({
			name: 'Left the voice channel',
			iconURL: this.bot.user?.avatarURL() ?? undefined,
		});
	}

	async stop() {
		await this.disableActiveNowPlayingEmbed();
		this.destroy()
	}

	override async onDestroy(): Promise<void> {
		this.plugin.manager.leave(this.id);
		this.plugin.queues.delete(this.id);
	}
}

export default class MusicPlugin extends BotPlugin {
	static GROUP = 'music';
	queues: Map<string, Queue> = new Map();
	manager: Manager;
	onVoiceServerUpdateCallback!: (data: VoiceServerUpdate) => Promise<boolean>;
	onVoiceStateUpdateCallback!: (data: VoiceStateUpdate) => Promise<boolean>;
	onGuildCreateCallback!: (data: unknown) => Promise<void>;

	youtubeRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]{11}/;
	spotifyRegex =
		/^(https?:\/\/)?open\.spotify\.com\/(user\/[a-zA-Z0-9]+\/)?(playlist|album|track|artist)\/[a-zA-Z0-9]+/;
	youtubePlaylistRegex =
		/^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+/;
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

		this.bot.ws
			.on(
				GatewayDispatchEvents.VoiceStateUpdate,
				this.manager.voiceStateUpdate.bind(this.manager)
			)
			.on(
				GatewayDispatchEvents.VoiceServerUpdate,
				this.manager.voiceServerUpdate.bind(this.manager)
			)
			.on(GatewayDispatchEvents.GuildCreate, async (data) => {
				if (data.voice_states.length) {
					for (const state of data.voice_states)
						await this.manager.voiceStateUpdate({
							...state,
							guild_id: data.id,
						});
				}
			});
		this.manager.on('error', (error, node) => {
			console.error('Lavacord Error On Node', node, '\n', error);
		});
	}

	getSourceType(source: string): ESourceType {
		if (this.youtubeRegex.test(source)) {
			return ESourceType.YOUTUBE;
		} else if (this.youtubePlaylistRegex.test(source)) {
			return ESourceType.YOUTUBE_PLAYLIST;
		} else if (this.spotifyRegex.test(source)) {
			return ESourceType.SPOTIFY;
		}

		return ESourceType.SEARCH;
	}

	async getQueueById(id: string) {
		return this.queues.get(id);
	}

	async getQueue(ctx: CommandContext) {
		if (!ctx.ctx.guildId) return null;

		if (this.queues.has(ctx.ctx.guildId)) {
			return this.queues.get(ctx.ctx.guildId)!;
		}

		const voiceChannelId = (ctx.asSlashContext.member as GuildMember).voice
			.channelId;

		if (!voiceChannelId) {
			throw new BotError('You are not in a voice channel');
		}

		const newQueue = new Queue(this);

		await newQueue.join(ctx.ctx.guildId, voiceChannelId, ctx.ctx.channelId);

		this.queues.set(ctx.ctx.guildId, newQueue);

		return newQueue;
	}

	async playSource(ctx: CommandContext, source: string) {
		await ctx.deferReply();

		const queue = await this.getQueue(ctx);

		if (!queue) {
			ctx.reply({
				embeds: [await buildBasicEmbed(ctx, 'How have you done this ?')],
			});
			return;
		}

		const tracksToAdd: ITrack[] = [];

		const loadResult = await LavacordRest.load(
			this.manager.idealNodes[0],
			source
		);

		if (
			loadResult.loadType === LoadType.TRACK_LOADED ||
			LoadType.PLAYLIST_LOADED
		) {
			tracksToAdd.push(
				...loadResult.tracks.map((a) => {
					const newTrack: ITrack = {
						track: a.track,
						title: a.info.title,
						url: a.info.identifier || a.info.uri,
						length: a.info.length,
						requester: ctx.asSlashContext.member as GuildMember,
					};
					return newTrack;
				})
			);
		} else if (loadResult.loadType === LoadType.SEARCH_RESULT) {
			const item = loadResult.tracks[0];
			tracksToAdd.push({
				track: item.track,
				title: item.info.title,
				url: item.info.identifier || item.info.uri,
				length: item.info.length,
				requester: ctx.asSlashContext.member as GuildMember,
			});
		}

		if (tracksToAdd.length === 0) {
			ctx.editReply({
				embeds: [
					await buildBasicEmbed(
						ctx,
						'TBH Idk what that link even is ¯\\_(ツ)_/¯'
					),
				],
			});
		} else {
			ctx.editReply({
				embeds: [
					await buildBasicEmbed(
						ctx,
						`Added ${tracksToAdd.length} Track${
							tracksToAdd.length > 1 ? 's' : ''
						} Added to Queue`,
						getMemeberAvatarUrl(ctx)
					),
				],
			});

			queue.addTracks(...tracksToAdd);
		}
	}

	override async onDestroy() {}
}
