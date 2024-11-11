import { BotPlugin } from '@modules/plugins';
import { Client } from 'discord.js';
import { ActivityType } from 'discord.js';

export default class PresencePlugin extends BotPlugin {
	constructor(dir: string) {
		super(dir);
		this.id = 'presence';
	}

	async onLoad(old?: this): Promise<void> {
		this.bot.user?.setActivity('Onlyfans', {
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			type: ActivityType.Streaming,
		});
	}

	async onDestroyed(): Promise<void> {}
}
