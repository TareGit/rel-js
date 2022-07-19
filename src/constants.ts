import { IDatabaseGuildSettings, IDatabaseUserSettings, IUserLevelData } from "./types";

export default class constants {
	static DEFAULT_GUILD_SETTINGS: IDatabaseGuildSettings = {
		id: "",
		color: "",
		prefix: "",
		nickname: "",
		language: "",
		welcome_options: "",
		leave_options: "",
		twitch_options: "",
		leveling_options: ""
	};

	static DEFAULT_USER_SETTINGS: IDatabaseUserSettings = {
		id: "",
		color: "",
		card_bg_url: "",
		card_opacity: 0,
		options: ""
	}
}