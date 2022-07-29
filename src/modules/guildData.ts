import axios from "axios";
import path from "path";
import EventEmitter from "events";
import {
    IDatabaseGuildSettings,
    IDatabaseUserSettings,
    IGuildLevelingData,
    IGuildSettings,
    IUserLevelData,
    IUserSettings,
} from "../types";
import constants from "../constants";
import { Guild } from "discord.js";

const { dataUpdateInterval } = bus.sync.require(
    path.join(process.cwd(), "./config.json")
) as typeof import("../config.json");

const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");

function convertFromDbSetting(setting: IDatabaseGuildSettings): IGuildSettings {
    return {
        ...setting,
        welcome_options: new URLSearchParams(setting.welcome_options),
        leave_options: new URLSearchParams(setting.leave_options),
        twitch_options: new URLSearchParams(setting.twitch_options),
        leveling_options: new URLSearchParams(setting.leveling_options),
    };
}

function convertToDbSetting(setting: IGuildSettings): IDatabaseGuildSettings {
    return {
        ...setting,
        welcome_options: setting.welcome_options.toString(),
        leave_options: setting.leave_options.toString(),
        twitch_options: setting.twitch_options.toString(),
        leveling_options: setting.leveling_options.toString(),
    };
}

function logPossibleAxiosError(error) {
    if (error.isAxiosError) {
        utils.log("Error making API request : ", error.data || error.message);
    } else {
        utils.log(error);
    }
}

async function updateGuilds() {
    if (!bus.guildsPendingUpdate.length) {
        setTimeout(updateGuilds, dataUpdateInterval * 1000);
        return;
    }

    try {
        const rows = (
            await bus.db.get(`/guilds?q=${bus.guildsPendingUpdate.join(",")}`)
        ).data as IDatabaseGuildSettings[];

        rows.forEach(function (dbSetting, index) {
            const setting = convertFromDbSetting(dbSetting);

            bus.guildSettings.set(setting.id, setting);

            if (
                bus.bot?.guilds.cache.get(dbSetting.id)?.me?.displayName !==
                dbSetting.nickname
            ) {
                const me = bus.bot?.guilds.cache.get(dbSetting.id)?.me;

                if (me?.permissions.has("CHANGE_NICKNAME")) {
                    me.setNickname(dbSetting.nickname, "Dashboard nickname changed.");
                }
            }

            bus.guildsPendingUpdate.splice(
                bus.guildsPendingUpdate.indexOf(setting.id),
                1
            );

            utils.log(`Updated Settings for Guild ${setting.id}`);
        });
    } catch (error) {
        logPossibleAxiosError(error);
    }

    setTimeout(updateGuilds, dataUpdateInterval * 1000);
}

async function updateUsers() {
    if (!bus.usersPendingUpdate.length) {
        setTimeout(updateUsers, dataUpdateInterval * 1000);
        return;
    }

    try {
        const rows: IDatabaseUserSettings[] = (
            await bus.db.get(`/users?q=${bus.usersPendingUpdate.join(",")}`)
        ).data;

        rows.forEach(function (dbSetting, index) {
            bus.userSettings.set(dbSetting.id, {
                ...dbSetting,
                options: new URLSearchParams(dbSetting.options),
            });

            bus.usersPendingUpdate.splice(
                bus.usersPendingUpdate.indexOf(dbSetting.id),
                1
            );

            utils.log(`Updated Settings for User ${dbSetting.id}`);
        });
    } catch (error) {
        logPossibleAxiosError(error);
    }

    setTimeout(updateUsers, dataUpdateInterval * 1000);
}

async function updateLeveling() {
    if (!bus.levelingDataPendingUpload.size) {
        setTimeout(updateLeveling, dataUpdateInterval * 1000);
        return;
    }

    try {
        bus.levelingDataPendingUpload.forEach((users, guildId) => {
            const levelingData = bus.guildLeveling.get(guildId)!;
            const dataToUpload = users.map(user => levelingData.data[user]);
            bus.db.post('/levels', dataToUpload);
        })

        bus.levelingDataPendingUpload.clear();

    } catch (error) {
        logPossibleAxiosError(error);
    }

    setTimeout(updateLeveling, dataUpdateInterval * 1000);
}

export async function onJoinedNewGuild(guild: Guild) {
    const dbSettings = constants.DEFAULT_GUILD_SETTINGS;

    const result: IDatabaseGuildSettings[] = (
        await bus.db.get(`/guilds?q=${guild.id}`)
    ).data;

    if (!result || !result.length) {
        await bus.db.put(`/guilds`, [{ ...dbSettings, id: guild.id }]);
    }

    bus.guildSettings.set(
        guild.id,
        convertFromDbSetting({ ...dbSettings, id: guild.id })
    );

    axios
        .post(`${process.env.SERVER_API}/notifications-guild`, {
            op: "add",
            data: [guild.id],
            target: `${process.env.CLUSTER_API}`,
        })
        .catch((error) =>
            utils.log(
                "Error asking server to track guild updates : ",
                error.message
            )
        );
}

export async function getUsers(ids: string[], createIfNotExists = true): Promise<IUserSettings[]> {
    try {
        const usersToFetch = ids;

        const usersFetched: IDatabaseUserSettings[] = (
            await bus.db.get(`/users?q=${usersToFetch.join(",")}`)
        ).data;

        const usersRecieved = usersFetched.map((user) => user.id);

        const usersNotRecieved = usersToFetch.filter(
            (user) => !usersRecieved.includes(user)
        );

        if (createIfNotExists) {
            const newUsers = usersNotRecieved.map((id) => ({
                ...constants.DEFAULT_USER_SETTINGS,
                id: id,
            }));

            await bus.db.put(`/users`, newUsers);

            usersFetched.push.apply(usersFetched, newUsers);
        }

        axios
            .post(`${process.env.SERVER_API}/notifications-user`, {
                op: "add",
                data: usersFetched.map(user => user.id),
                target: `${process.env.CLUSTER_API}`,
            })
            .catch((error) =>
                utils.log(
                    "Error asking server to track guild updates : ",
                    error.message
                )
            );

        return usersFetched.map((user) => ({
            ...user,
            options: new URLSearchParams(user.options),
        }));
    } catch (error) {
        logPossibleAxiosError(error)
        return [];
    }

}

export async function load() {
    try {
        if (bus.bot?.guilds) {
            bus.guildsPendingUpdate.push.apply(
                bus.guildsPendingUpdate,
                Array.from(bus.bot.guilds.cache.keys())
            );

            axios
                .post(`${process.env.SERVER_API}/notifications-guild`, {
                    op: "add",
                    data: bus.guildsPendingUpdate,
                    target: `${process.env.CLUSTER_API}`,
                })
                .catch((error) =>
                    utils.log(
                        "Error asking server to track guild updates : ",
                        error.message
                    )
                );

            try {
                const rows: IDatabaseGuildSettings[] = (
                    await bus.db.get(`/guilds?q=${bus.guildsPendingUpdate.join(",")}`)
                ).data;

                utils.log(bus.guildsPendingUpdate.length, "Guilds to Fetch");

                rows.forEach(function (dbSetting) {
                    const setting = convertFromDbSetting(dbSetting);

                    bus.guildSettings.set(setting.id, setting);

                    if (
                        bus.bot?.guilds.cache.get(dbSetting.id)?.me?.displayName !==
                        dbSetting.nickname
                    ) {
                        const me = bus.bot?.guilds.cache.get(dbSetting.id)?.me;
                        if (me?.permissions.has("CHANGE_NICKNAME")) {
                            me.setNickname(dbSetting.nickname, "Dashboard nickname changed.");
                        }
                    }

                    bus.guildsPendingUpdate.splice(
                        bus.guildsPendingUpdate.indexOf(setting.id),
                        1
                    );
                });
            } catch (error) {
                logPossibleAxiosError(error);
            }

            utils.log(bus.guildsPendingUpdate.length, "Guilds Left");

            const settingsToPush: IDatabaseGuildSettings[] =
                bus.guildsPendingUpdate.map(function (guildId) {
                    bus.guildSettings.set(
                        guildId,
                        convertFromDbSetting({
                            ...constants.DEFAULT_GUILD_SETTINGS,
                            id: guildId,
                        })
                    );

                    return { ...constants.DEFAULT_GUILD_SETTINGS, id: guildId };
                });

            await bus.db.put(`/guilds`, settingsToPush).catch(logPossibleAxiosError);

            bus.guildsPendingUpdate.splice(0, bus.guildsPendingUpdate.length);

            const guildsToFetchLevelingFor: string[] = Array.from(
                bus.bot.guilds.cache.keys()
            );

            const levels: IUserLevelData[] = (
                await bus.db.get(`/levels?q=${guildsToFetchLevelingFor.join(",")}`)
            ).data;

            const usersToFetch: string[] = [];

            levels.forEach((levelData) => {

                if (!usersToFetch.includes(levelData.user)) {
                    usersToFetch.push(levelData.user);
                }

                if (!bus.guildLeveling.has(levelData.guild)) {
                    bus.guildLeveling.set(
                        levelData.guild,
                        constants.DEFAULT_GUILD_LEVEL_DATA
                    );
                }

                (bus.guildLeveling.get(levelData.guild) as IGuildLevelingData).data[
                    levelData.user
                ] = levelData;
                (bus.guildLeveling.get(levelData.guild) as IGuildLevelingData).rank.push(
                    levelData.user
                );
            });

            await getUsers(usersToFetch);
        }

    } catch (error) {
        logPossibleAxiosError(error)
    }

    // update guilds every 10 seconds
    setTimeout(updateGuilds, dataUpdateInterval * 1000);

    // update users every 10 seconds
    setTimeout(updateUsers, dataUpdateInterval * 1000);

    // update leveling data every 10 seconds
    setTimeout(updateLeveling, dataUpdateInterval * 1000);
}
