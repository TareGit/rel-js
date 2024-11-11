import { ClusterManager } from 'discord-hybrid-sharding';
import {
	Client,
	GuildMember,
	TextBasedChannel,
	VoiceBasedChannel,
} from 'discord.js';

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

export const enum ECommandType {
	UNKNOWN = -1,
	SLASH = 1,
	USER_CONTEXT_MENU = 2,
	CHAT_CONTEXT_MENU = 3,
}

export const enum EUmekoCommandContextType {
	CHAT_MESSAGE = 0,
	SLASH_COMMAND = 1,
	MESSAGE_CONTEXT_MENU = 2,
	USER_CONTEXT_MENU = 3,
}

export const enum ECommandOptionType {
	SUB_COMMAND = 1,
	STRING = 3,
	INTEGER = 4,
	BOOLEAN = 5,
	USER = 6,
	CHANNEL = 7,
	ROLE = 8,
}

export const enum EMusicCheckType {
	SEARCH = 0,
	SPOTIFY_TRACK = 1,
	SPOTIFY_ALBUMN = 2,
	SPOTIFY_PLAYLIST = 3,
}

export interface IMusicUrlCheck {
	type: EMusicCheckType;
	id?: string;
}

export interface ICommandOption {
	name: string;
	description: string;
	type: ECommandOptionType;
	required: boolean;
	choices?: { name: string; value: string }[];
}

export interface ISong {
	id: string;
	track: string;
	title: string;
	uri: string;
	length: number;
	requester: GuildMember;
	groupURL?: string;
}

export interface ISavedSong {
	member: string;
	uri: string;
}

export interface ISavedQueue {
	identifier?: string;
	id: string;
	channel: string;
	voice: string;
	songs: ISavedSong[];
	loopType: ELoopType;
	volume: number;
}

export interface ILoadedQueue {
	identifier?: string;
	id: string;
	channel: TextBasedChannel;
	voice: VoiceBasedChannel;
	songs: ISong[];
	loopType: ELoopType;
	volume: number;
}

export interface IOsuApiUser {
	id: string;
	avatar_url: string;
	country_code: string;
	is_online: boolean;
	username: string;
	country: {
		code: string;
		name: string;
	};
	playmode: string;
	statistics: {
		global_rank: number;
		hit_accuracy: number;
	};
}

export interface IWallpaperzWallpaper {
	id: string;

	width: number;

	height: number;

	downloads: number;

	uploaded_at: number;

	uploader: string;

	tags: string;
}

export interface IMALAnime {}

export interface IDiscordApiCommand {
	name: string;
	description?: string;
	options?: IDiscordApiCommand[] | ICommandOption[];
	type?: ECommandType | ECommandOptionType;
}

export type Awaitable<T> = T | Promise<T>;

declare global {
	var ClusterManager: ClusterManager;
}

declare global {
	namespace NodeJS {
		// Alias for compatibility
		interface ProcessEnv extends Dict<string> {
			DB_HOST: string;
			DB_TARGET: string;
			DB_USER: string;
			DB_PASS: string;
			SERVER_API_DEBUG: string;
			SERVER_API: string;
			CLUSTER_API_DEBUG: string;
			CLUSTER_API: string;
			DISCORD_BOT_ID: string;
			DISCORD_BOT_TOKEN: string;
			DISCORD_BOT_ID_ALPHA: string;
			DISCORD_BOT_TOKEN_ALPHA: string;
			SPOTIFY_API: string;
			SPOTIFY_API_AUTH: string;
			SPOTIFY_CLIENT_ID: string;
			SPOTIFY_CLIENT_SECRET: string;
			CREATOR_ID: string;
			APEX_API_KEY: string;
			LAVALINK_PASSWORD: string;
			WEBSITE: string;
			MAL_API: string;
			MAL_API_KEY: string;
			TMDB_API: string;
			TMDB_API_KEY: string;
			OSU_CLIENT_ID: string;
			OSU_CLIENT_SECRET: string;
			OSU_API_CALLBACK: string;
			OSU_API: string;
			OSU_API_AUTH: string;
			TWITCH_API_CALLBACK: string;
		}
	}
}
