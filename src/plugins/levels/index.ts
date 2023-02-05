import { Client, Message, User } from "discord.js";
import { BotPlugin } from "@modules/exports";
import { DatabaseApi } from '@core/api'
import { log, randomIntegerInRange } from "@core/utils";
import { IUserLevelData, IUmekoApiResponse, FrameworkConstants, EOptsKeyLocation } from "@core/framework";

// Calculates the xp required to get to the next level
export function getXpForNextLevel(level: number) {
    return level ** 2 * 3 + 100;
}

// Calculates the total xp at a specific level
export function getTotalXp(level: number) {
    return 0.5 * (level + 1) * (level ** 2 * 2 + level + 200);
}

class GuildLevelingData {
    cache: { [userId: string]: IUserLevelData } = {}
    ranking: string[] = []
    guild: string;
    constructor(guildId: string) {
        this.guild = guildId;
    }

    addUser(user: IUserLevelData) {
        this.cache[user.user] = user;
        this.ranking.push(user.user);
    }

    sort() {
        this.ranking.sort((userA, userB) => {
            const aData = this.cache[userA];
            const bData = this.cache[userB];

            if (aData.level === bData.level)
                return bData.xp - aData.xp;

            return bData.level - aData.level;
        });
    }

    addUserXp(userId: string, xp: number): boolean {

        this.cache[userId].xp += xp;

        const nextLevelXp = getXpForNextLevel(this.cache[userId].level);

        if (this.cache[userId].xp >= nextLevelXp) {
            this.cache[userId].level += 1;
            this.cache[userId].xp = nextLevelXp - this.cache[userId].xp;
            return true
        }
        else {
            return false;
        }
    }

    async uploadNewUser(userId: string) {
        this.addUser({ ...FrameworkConstants.DEFAULT_USER_LEVEL_DATA, guild: this.guild, user: userId })
        await DatabaseApi.put('/levels', [this.cache[userId]]);
    }

    async getUser(userId: string) {
        if (!this.cache[userId]) {
            await this.uploadNewUser(userId);
        }
        return this.cache[userId];
    }

    async getUserRank(userId: string) {
        return this.ranking.indexOf(userId);
    }
}

export default class LevelingPlugin extends BotPlugin {
    cache: Map<string, GuildLevelingData> = new Map();
    onMessageCreateCallback: (message: Message) => Promise<void> = this.onMessageCreate.bind(this);
    constructor(bot: Client, dir: string) {
        super(bot, dir)
        this.id = 'levels'
    }

    async getUserLevel(guild: string, user: User) {

    }

    async onRegistered() {
        const guilds = Array.from(this.bot.guilds.cache.keys());
        const response = (await DatabaseApi.get<IUmekoApiResponse<IUserLevelData[]>>(`/levels?ids=${guilds.join(',')}`)).data
        if (response.error) {
            throw new Error(response.data);
        }

        response.data.forEach((d) => {
            if (!this.cache.has(d.guild)) {
                this.cache.set(d.guild, new GuildLevelingData(d.guild))
            }

            this.cache.get(d.guild)!.addUser(d);
        })

        this.cache.forEach((d) => {
            d.sort();
        })

        this.bot.on('messageCreate', this.onMessageCreateCallback);

        this.isReady = true;
    }

    ensureGuild(guildId: string) {
        if (!this.cache.has(guildId)) {
            this.cache.set(guildId, new GuildLevelingData(guildId));
        }
    }

    async addXp(guildId: string, userId: string, xp: number) {
        await this.ensureReady()

        this.ensureGuild(guildId);

        return this.cache.get(guildId)!.addUserXp(userId, xp);
    }

    async getLevelData(guildId: string, userId: string) {
        await this.ensureReady()

        this.ensureGuild(guildId);
        return await this.cache.get(guildId)!.getUser(userId);
    }


    async getRank(guildId: string, userId: string) {
        await this.ensureReady()

        this.ensureGuild(guildId);

        return this.cache.get(guildId)!.getUserRank(userId);
    }

    async onMessageCreate(message: Message) {
        if (!(this.bot.user !== message.author && !message.author.bot && message.member)) return;

        try {
            const levelingOptions = (await bus.database.getGuild(message.member.guild.id)).raw.level_opts;

            if (!levelingOptions.get("location") || levelingOptions.get("location") === EOptsKeyLocation.NONE) {
                return;
            }

            if (await this.addXp(message.member.guild.id, message.author.id, randomIntegerInRange(5, 10) * 100)) {
                const userData = await this.getLevelData(message.member.guild.id, message.author.id)
                const levelUpMsg = "{username} Just leveled up".replace(/{user}/gi, `<@${message.author.id}>`)
                    .replace(/{username}/gi, `${message.member?.displayName}`)
                    .replace(/{level}/gi, `${userData.level}`)
                    .replace(/{server}/gi, `${message.member.guild.name}`)
                    .replace(/{id}/gi, `${message.author.id}`) || '';


                //levelingData.data[userId].lastXpUpdateAmmount = levelingData.data[userId].progress - xpUpdateThreshold;//  force an update to the backend

                if (levelUpMsg) {
                    message.channel.send(levelUpMsg);
                }
            }

        } catch (error) {
            log(error);
        }
    }

    async onDeregistered() {
        this.bot.off('messageCreate', this.onMessageCreateCallback);
    }
}