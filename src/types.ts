import { Axios } from "axios";
import { CommandInteraction, GuildMember, Message, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import Sync from "heatsync";
import { Manager } from "lavacord";
import Queue from "./classes/Queue";

declare global {

    enum ELoopType {
        NONE = "off",
        SONG = "song",
        QUEUE = "queue"
    }

    enum ECommandType {
        SLASH = 1,
        USER = 2,
        CONTEXT_MENU = 3
    }

    enum EUmekoCommandContextType {
        CHAT_MESSAGE = 0,
        SLASH_COMMAND = 1,
        CONTEXT_MENU = 2,
        USER_COMMAND = 3
    }

    enum ECommandOptionType {
        STRING = 3,
        INTEGER = 4,
        BOOLEAN = 5,
        USER = 6,
        CHANNEL = 7,
        ROLE = 8
    }

    enum EMusicCheckType {
        SEARCH = 0,
        SPOTIFY_TRACK = 1,
        SPOTIFY_ALBUMN = 2,
        SPOTIFY_PLAYLIST = 3

    }

    interface IMusicUrlCheck {
        type: EMusicCheckType;
        id?: string;
    }

    interface IUmekoCommandOption {
        name: string;
        description: string;
        type: 3,
        required: boolean;
    }

    interface IParsedMessage extends Message {
        pureContent: string;
        args: string[];
    }

    interface IUmekoCommandContext {
        command: IParsedMessage | CommandInteraction
        type: EUmekoCommandContextType;
    }

    interface IUmekoCommand {
        name: string
        type: ECommandType;
        description: string;
        execute: (ctx: IUmekoCommandContext) => Promise<void>;
    }

    interface IUmekoSlashCommand extends IUmekoCommand {
        category: string;
        syntax: string;
        options: IUmekoCommandOption[]
    }

    interface IUmekoUserCommand extends IUmekoCommand {
        options: IUmekoCommandOption[]
    }

    interface IUmekoMessageCommand extends IUmekoCommand {
        category: string;
        syntax: string;
    }

    interface IUmekoMessageChat extends IUmekoCommand {
        category: string;
        syntax: string;
    }

    interface IGuildLevelingData {

    }

    interface IGuildSettings {
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

    interface IUserSettings {

    }

    interface ISong {
        id: string;
        track: string;
        title: string;
        uri: string;
        length: number;
        requester: GuildMember;
        groupURL?: string;
    }

    interface ISavedSong {
        member: string;
        uri: string;
    }

    interface IDataBus {
        guildSettings: Map<string, IGuildSettings>;
        userSettings: Map<string, IUserSettings>;
        guildLeveling: Map<string, IGuildLevelingData>;
        queues: Map<string, Queue>;
        slashCommands: Map<string, IUmekoSlashCommand>;
        messageCommands: Map<string, IUmekoMessageCommand>;
        userCommands: Map<string, IUmekoUserCommand>;
        commandsPaths: Map<string, IGuildSettings>;
        lavacordManager: Manager | null;
        disabledCategories: string[],
        guildsPendingUpdate: string[],
        usersPendingUpdate: string[],
        sync: Sync;
        moduleReloadLog: Map<string, string>,
        db: Axios
    }

    interface ISavedQueue {
        identifier?: string;
        id: string;
        channel: string;
        voice: string;
        songs: ISavedSong[]
        loopType: ELoopType;
        volume: number;
    }

    interface ILoadedQueue {
        identifier?: string;
        id: string;
        channel: TextBasedChannel;
        voice: VoiceBasedChannel;
        songs: ISong[]
        loopType: ELoopType;
        volume: number;
    }





}

export { }