import {
	IDatabaseGuildSettings,
	IDatabaseUserSettings,
	IGuildLevelingData,
	IUserLevelData,
} from "@core/types";

export default class constants {

	static DATA_UPDATE_INTERVAL = 10;
	static QUEUE_TIMEOUT = 300000;
	static QUEUE_ITEMS_PER_PAGE = 10;
	static XP_UPDATE_THRESHHOLD = 100

	static DEFAULT_BOT_NAME = "Umeko";
	static DEFAULT_BOT_LOCALE = "en";
	static DEFAULT_BOT_COLOR = "#2f3136";
	static DEFAULT_USER_CARD_COLOR = "#87ceeb"
	static DEFAULT_USER_CARD_OPACITY = 0.8;
	static DEFAULT_USER_CARD_BG = 'https://r4.wallpaperflare.com/wallpaper/108/140/869/digital-digital-art-artwork-fantasy-art-drawing-hd-wallpaper-d8b62d28c0f06c48d03c114ec8f2b4aa.jpg';

	static DEFAULT_GUILD_SETTINGS: IDatabaseGuildSettings = {
		id: "",
		bot_opts: new URLSearchParams({ color: this.DEFAULT_BOT_COLOR, nickname: this.DEFAULT_BOT_NAME, locale: this.DEFAULT_BOT_LOCALE }).toString(),
		join_opts: "",
		leave_opts: "",
		twitch_opts: "",
		level_opts: "",
		opts: ""
	};

	static DEFAULT_USER_SETTINGS: IDatabaseUserSettings = {
		id: "",
		card: new URLSearchParams({ color: constants.DEFAULT_USER_CARD_COLOR, bg_delete: "", bg: "", opacity: `${this.DEFAULT_USER_CARD_OPACITY}` }).toString(),
		opts: "",
		flags: 0
	};

	static DEFAULT_USER_LEVEL_DATA: IUserLevelData = {
		user: "",
		guild: "",
		level: 0,
		xp: 0
	};

	static DEFAULT_GUILD_LEVEL_DATA: IGuildLevelingData = {
		data: {},
		rank: [],
	};

	static BOT_VERSION = 5.0

	static COMMAND_GROUPS = {
		FUN: "fun",
		NONE: "",
		GENERAL: "general"
	}
}
