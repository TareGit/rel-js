import { Axios, AxiosInstance } from "axios";
import {
  Client as ClusterClient,
  Manager as ClusterManager,
} from "discord-hybrid-sharding";
import {
  ButtonInteraction,
  Client,
  ClientEvents,
  CommandInteraction,
  GuildMember,
  Message,
  TextBasedChannel,
  VoiceBasedChannel,
} from "discord.js";
import Sync from "heatsync";
import { Manager as LavaManager } from "lavacord";
import { Queue } from "./modules/music";

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
  USER = 2,
  CONTEXT_MENU = 3,
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

export interface IUmekoCommand {
  name: string;
  type: ECommandType;
  description: string;
  dependencies: string[];
  execute: (ctx: IUmekoCommandContext, ...args: any[]) => Promise<any>;
}

export interface IUmekoSlashCommand extends IUmekoCommand {
  category: string;
  group?: string;
  syntax: string;
  options: ICommandOption[];
}

export interface IUmekoUserCommand extends IUmekoCommand {
  options: ICommandOption[];
}

export interface IUmekoContextMenuCommand extends IUmekoCommand {
  category: string;
  syntax: string;
}

export interface IUmekoMessageChat extends IUmekoCommand {
  category: string;
  syntax: string;
}

export interface IUserLevelData {
  user: string;
  guild: string;
  level: number;
  progress: number;
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
  color: string;
  prefix: string;
  nickname: string;
  language: string;
  welcome_options: URLSearchParams;
  leave_options: URLSearchParams;
  twitch_options: URLSearchParams;
  leveling_options: URLSearchParams;
}

export interface IDatabaseGuildSettings {
  id: string;
  color: string;
  prefix: string;
  nickname: string;
  language: string;
  welcome_options: string;
  leave_options: string;
  twitch_options: string;
  leveling_options: string;
}

export interface IDatabaseUserSettings {
  id: string;
  color: string;
  card_bg_url: string;
  card_opacity: number;
  options: string;
}

export interface IUserSettings {
  id: string;
  color: string;
  card_bg_url: string;
  card_opacity: number;
  options: URLSearchParams;
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

export interface bus {
  guildSettings: Map<string, IGuildSettings>;
  userSettings: Map<string, IUserSettings>;
  commandsPaths: Map<string, IGuildSettings>;
  guildLeveling: Map<string, IGuildLevelingData>;
  slashCommands: Map<string, IUmekoSlashCommand>;
  contextMenuCommands: Map<string, IUmekoContextMenuCommand>;
  userCommands: Map<string, IUmekoUserCommand>;
  moduleReloadLog: Map<string, string>;
  guildsPendingUpdate: string[];
  usersPendingUpdate: string[];
  disabledCategories: string[];
  sync: Sync;
  db: AxiosInstance;
  bot: Client | null;
  queues: Map<string, Queue>;
  levelingDataPendingUpload: Map<string, string[]>;
  cluster: ClusterClient | null;
  lavacordManager: LavaManager | null;
  boundBotEvents: Map<keyof ClientEvents, (...args: any[]) => void>;
  manager: ClusterManager | null;
  loadedSyncFiles: string[];
  dependencies: Map<string, string[]>
}

declare global {
  var bus: bus;
}
