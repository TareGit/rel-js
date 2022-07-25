import path from "path";
import {
	IDatabaseGuildSettings,
	IDatabaseUserSettings,
	IGuildLevelingData,
	IUserLevelData,
} from "./types";
const {
	defaultUserColor,
	defaultPrefix,
	defaultPrimaryColor,
	defaultLanguage,
	defaultNickname,
} = bus.sync.require(
	path.join(__dirname, "config.json")
) as typeof import("./config.json");

export default class constants {
	static DEFAULT_GUILD_SETTINGS: IDatabaseGuildSettings = {
		id: "",
		color: defaultPrimaryColor,
		prefix: defaultPrefix,
		nickname: defaultNickname,
		language: defaultLanguage,
		welcome_options: "",
		leave_options: "",
		twitch_options: "",
		leveling_options: "",
	};

	static DEFAULT_USER_SETTINGS: IDatabaseUserSettings = {
		id: "",
		color: defaultUserColor,
		card_bg_url: "",
		card_opacity: 0.8,
		options: "",
	};

	static DEFAULT_USER_LEVEL_DATA: IUserLevelData = {
		guild: "",
		user: "",
		level: 0,
		progress: 0,
	};

	static DEFAULT_GUILD_LEVEL_DATA: IGuildLevelingData = {
		data: {},
		rank: [],
	};
}
