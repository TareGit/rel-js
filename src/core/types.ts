import { Manager } from "discord-hybrid-sharding";
import {
  ButtonInteraction,
  ClientEvents,
  CommandInteraction,
  GuildMember,
  Message,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";

export const enum ELoopType {
  NONE = "off",
  SONG = "song",
  QUEUE = "queue",
}

export const enum EQueueSource {
  COMMAND = 0,
  QUEUE = 1,
  SAVED_QUEUE = 2,
}

export const enum ECommandType {
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

export type IDatabaseResponse<T = any> = {
  data: T;
  error: false;
} | {
  data: string;
  error: true;
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
  choices?: { name: string, value: string }[];
}

export interface IParsedMessage extends Message {
  pureContent: string;
  args: string[];
  message: Message;
}

export interface IUmekoCommandContext {
  command: IParsedMessage | CommandInteraction | ButtonInteraction;
  type: EUmekoCommandContextType;
}

export interface IUmekoCommandOld {
  name: string;
  type: ECommandType;
  description: string;
  dependencies: string[];
  execute: (ctx: IUmekoCommandContext, ...args: any[]) => Promise<any>;
}

export interface IUmekoSlashCommandOld extends IUmekoCommandOld {
  category: string;
  group?: string;
  syntax: string;
  options: ICommandOption[];
}

export interface IUmekoUserCommandOld extends IUmekoCommandOld {
  options: ICommandOption[];
}

export interface IUmekoContextMenuCommand extends IUmekoCommandOld {
  category: string;
  syntax: string;
}

export interface IUmekoMessageChat extends IUmekoCommandOld {
  category: string;
  syntax: string;
}

export interface IUserLevelData {
  user: string;
  guild: string;
  level: number;
  xp: number;
}

export interface IGuildLevelingData {
  data: { [userId: string]: IUserLevelData };
  rank: string[];
}

export interface IBotEvent {
  event: keyof ClientEvents;
  funct: (...args: any[]) => void;
}

export interface IGuildSettings {
  id: string;
  bot_opts: URLSearchParams;
  join_opts: URLSearchParams;
  leave_opts: URLSearchParams;
  twitch_opts: URLSearchParams;
  level_opts: URLSearchParams;
  opts: URLSearchParams;
}

export interface IDatabaseGuildSettings {
  id: string;
  bot_opts: string;
  join_opts: string;
  leave_opts: string;
  twitch_opts: string;
  level_opts: string;
  opts: string;
}

export interface IUserSettings {
  id: string;
  card: URLSearchParams;
  opts: URLSearchParams;
  flags: number;
}

export interface IDatabaseUserSettings {
  id: string;
  card: string;
  opts: string;
  flags: number;
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

export interface IMALAnime {

}

export interface IDiscordApiCommand {
  name: string;
  description?: string;
  options?: IDiscordApiCommand[] | ICommandOption[];
  type?: ECommandType | ECommandOptionType,
}

declare global {
  var ClientManager: Manager;
}
