import { Client, Presence, TextChannel } from "discord.js";
import { BotPlugin } from "@modules/plugins";
import { log } from "@core/utils";

export default class TwitchPlugin extends BotPlugin {
    callback: typeof this.onPresenceUpdate;
    constructor(bot: Client) {
        super(bot);
        this.bot = bot;
        this.callback = this.onPresenceUpdate.bind(this)
    }

    async onRegistered() {
        this.bot.on('presenceUpdate', this.callback)
    }

    async onPresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
        if (!newPresence.guild || !newPresence.member) return;

        const guildSettings = await bus.database.getGuild(newPresence.guild.id);

        if (!guildSettings) {
            return
        }

        const twitchOptions = guildSettings.twitch_opts

        if (!twitchOptions.get('location') || twitchOptions.get('location') === "disabled") {
            return
        }

        try {
            const relevantNewActivities =
                newPresence && newPresence.activities
                    ? newPresence.activities.filter(
                        (activity) => activity.name === "Twitch"
                    )
                    : [];

            const relevantOldActivities =
                oldPresence && oldPresence.activities
                    ? oldPresence.activities.filter(
                        (activity) => activity.name === "Twitch"
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
                const twitchOnlineMsg = (twitchOptions.get("msg") || "")
                    .replace(/{user}/gi, `<@${userId}>`)
                    .replace(/{username}/gi, `${username}`)
                    .replace(/{link}/gi, `${url}`);

                if (twitchOptions.get("location") === "channel" && twitchOptions.get("channel")) {
                    const channel = await newPresence.guild.channels
                        .fetch(twitchOptions.get("channel")!)
                        .catch(log) as TextChannel | null;

                    if (channel) {
                        channel.send(twitchOnlineMsg);
                    }
                }

                if (twitchOptions.get("role_give")) {
                    const roles = twitchOptions
                        .get("role_give")!
                        .split(",")
                        .filter(
                            (role) =>
                                !Array.from(newPresence.member!.roles.cache.keys()).includes(role)
                        );

                    const user = newPresence.member;

                    if (roles?.length) {
                        await user.roles.add(roles, "Started Streaming").catch(log);
                    }
                }
            } else {
                if (twitchOptions.get("role_give")) {
                    const roles = twitchOptions
                        .get("role_give")!
                        .split(",")
                        .filter((role) =>
                            Array.from(newPresence.member!.roles.cache.keys()).includes(role)
                        );

                    const user = newPresence.member;

                    if (roles?.length) {
                        await user.roles.remove(roles, "Stopped Streaming").catch(log);
                    }
                }
            }
        } catch (error) {
            log(error);
        }
    }

    async onDeregistered() {
        this.bot.off('presenceUpdate', this.callback);
    }
}