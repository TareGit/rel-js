import { locationIsChannel, EOptsKeyLocation } from '@core/framework';
import { BotPlugin } from '@modules/plugins';
import { Client, Presence, TextChannel } from 'discord.js';

export default class TwitchPlugin extends BotPlugin {
	onPresenceUpdateCallback!: (
		oldPresence: Presence | null,
		newPresence: Presence
	) => Promise<void>;

	constructor(dir: string) {
		super(dir);
		this.id = 'twitch';
	}

	override async onLoad(old?: this): Promise<void> {
		this.onPresenceUpdateCallback = this.onPresenceUpdate.bind(this);
		this.bot.on('presenceUpdate', this.onPresenceUpdateCallback);
	}

	override async onDestroy(): Promise<void> {
		this.bot.off('presenceUpdate', this.onPresenceUpdateCallback);
	}

	async onPresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
		if (!newPresence.guild || !newPresence.member) return;

		const guildSettings = await bus.database.getGuild(newPresence.guild.id);

		const twitchOptions = guildSettings.raw.twitch_opts;

		if (
			!twitchOptions.get('location') ||
			twitchOptions.get('location') === EOptsKeyLocation.NONE
		) {
			return;
		}

		try {
			const relevantNewActivities =
				newPresence && newPresence.activities
					? newPresence.activities.filter(
							(activity) => activity.name === 'Twitch'
					  )
					: [];

			const relevantOldActivities =
				oldPresence && oldPresence.activities
					? oldPresence.activities.filter(
							(activity) => activity.name === 'Twitch'
					  )
					: [];

			const bJustWentLive =
				relevantNewActivities.length && !relevantOldActivities.length;

			const bJustWentOffline =
				!relevantNewActivities.length && relevantOldActivities.length;

			if (!bJustWentLive && !bJustWentOffline) return;

			if (bJustWentLive) {
				const targetActivity = relevantNewActivities[0];

				const guildId = newPresence.guild.id;
				const userId = newPresence.member.id;
				const username = newPresence.member.displayName;
				const url = targetActivity.url;

				// Twitch online message here
				const twitchOnlineMsg = twitchOptions
					.get('message')
					.replace(/{user}/gi, `<@${userId}>`)
					.replace(/{username}/gi, `${username}`)
					.replace(/{link}/gi, `${url}`);

				if (locationIsChannel(twitchOptions.get('location') as any)) {
					const channel = (await newPresence.guild.channels
						.fetch(twitchOptions.get('location'))
						.catch(console.error)) as TextChannel | null;

					if (channel) {
						channel.send(twitchOnlineMsg);
					}
				}

				if (twitchOptions.get('role-give')) {
					const roles = twitchOptions
						.get('role-give')!
						.split(',')
						.filter(
							(role) =>
								!Array.from(newPresence.member!.roles.cache.keys()).includes(
									role
								)
						);

					const user = newPresence.member;

					if (roles?.length) {
						await user.roles
							.add(roles, 'Started Streaming')
							.catch(console.error);
					}
				}
			} else {
				if (twitchOptions.get('role-give')) {
					const roles = twitchOptions
						.get('role-give')
						.split(',')
						.filter((role) =>
							Array.from(newPresence.member!.roles.cache.keys()).includes(role)
						);

					const user = newPresence.member;

					if (roles?.length) {
						await user.roles
							.remove(roles, 'Stopped Streaming')
							.catch(console.error);
					}
				}
			}
		} catch (error) {
			console.error(error);
		}
	}
}
