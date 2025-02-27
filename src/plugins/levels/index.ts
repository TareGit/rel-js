import { Message } from 'discord.js';
import { BotPlugin } from '@modules/exports';
import { randInt } from '@core/utils';
import {
	IUserLevelData,
	FrameworkConstants,
	EOptsKeyLocation,
} from '@core/common';
import { ELoadableState } from '@core/base';

// Calculates the xp required to get to the next level
export function getXpForNextLevel(level: number) {
	return level ** 2 * 3 + 100;
}

// Calculates the total xp at a specific level
export function getTotalXp(level: number) {
	return 0.5 * (level + 1) * (level ** 2 * 2 + level + 200);
}
const LEVELS_UPDATE_FREQUENCY = 1000 * 60 * 5;

class GuildLevelingData {
	cache: { [userId: string]: IUserLevelData } = {};
	ranking: string[] = [];
	guild: string;
	pendingLevelingUpdates: Set<string> = new Set();
	updateTimeout: ReturnType<typeof setTimeout> | null = null;
	constructor(guildId: string) {
		this.guild = guildId;
		this.updatePendingLevels();
	}

	async updatePendingLevels() {
		this.updateTimeout = null;

		if (this.pendingLevelingUpdates.size) {
			try {
				const updates = Array.from(this.pendingLevelingUpdates)
					.map((a) => this.cache[a])
					.filter((a) => a !== undefined && a !== null);

				await bus.database.transaction(async (con) => {
					await Promise.allSettled([
						updates.map((a) => {
							return con.query(
								'UPDATE levels SET level=$1, xp=$2 WHERE user_id=$3 AND guild_id=$4',
								[a.level, a.xp, a.user_id, a.guild_id]
							);
						}),
					]);
				});
				this.pendingLevelingUpdates.clear();
			} catch (error) {
				console.error(error);
			}
		}

		this.updateTimeout = setTimeout(
			this.updatePendingLevels.bind(this),
			LEVELS_UPDATE_FREQUENCY
		);
	}

	addUser(user: IUserLevelData) {
		this.cache[user.user_id] = user;
		this.ranking.push(user.user_id);
	}

	sort() {
		this.ranking.sort((userA, userB) => {
			const aData = this.cache[userA];
			const bData = this.cache[userB];

			if (aData.level === bData.level) return bData.xp - aData.xp;

			return bData.level - aData.level;
		});
	}

	addUserXp(userId: string, xp: number): boolean {
		this.cache[userId].xp += xp;

		const nextLevelXp = getXpForNextLevel(this.cache[userId].level);

		const leveledUp = this.cache[userId].xp > nextLevelXp;

		if (leveledUp) {
			this.cache[userId].level += 1;
			this.cache[userId].xp = this.cache[userId].xp - nextLevelXp;
		}

		this.pendingLevelingUpdates.add(userId);
		return leveledUp;
	}

	async uploadNewUser(userId: string) {
		this.addUser({
			...FrameworkConstants.DEFAULT_USER_LEVEL_DATA,
			guild_id: this.guild,
			user_id: userId,
		});

		await bus.database.transaction(async (con) => {
			const newItem = this.cache[userId];
			await con.query('INSERT INTO levels VALUES ($1,$2,$3,$4)', [
				newItem.user_id,
				newItem.guild_id,
				newItem.level,
				newItem.xp,
			]);
		});
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

	onDestroy() {
		if (this.updateTimeout) {
			clearTimeout(this.updateTimeout);
		}
	}
}

export default class LevelingPlugin extends BotPlugin {
	cache: Map<string, GuildLevelingData> = new Map();
	onMessageCreateCallback: (message: Message) => Promise<void> =
		this.onMessageCreate.bind(this);
	constructor(dir: string) {
		super(dir);
		this.id = 'levels';
	}

	override async onLoad() {
		const guilds = Array.from(this.bot.guilds.cache.keys());
		const levelsDatabaseQuery =
			await bus.database.connection.query<IUserLevelData>(
				'SELECT * FROM levels WHERE guild_id = ANY($1)',
				[guilds]
			);

		const rows = levelsDatabaseQuery.rows;
		rows.forEach((d) => {
			if (!this.cache.has(d.guild_id)) {
				this.cache.set(d.guild_id, new GuildLevelingData(d.guild_id));
			}

			this.cache.get(d.guild_id)!.addUser(d);
		});

		this.cache.forEach((d) => {
			d.sort();
		});

		this.bot.on('messageCreate', this.onMessageCreateCallback);
	}

	ensureGuild(guildId: string) {
		if (!this.cache.has(guildId)) {
			this.cache.set(guildId, new GuildLevelingData(guildId));
		}
	}

	async addXp(guildId: string, userId: string, xp: number) {
		await this.waitForState(ELoadableState.ACTIVE);

		this.ensureGuild(guildId);

		return this.cache.get(guildId)!.addUserXp(userId, xp);
	}

	async getLevelData(guildId: string, userId: string) {
		await this.waitForState(ELoadableState.ACTIVE);

		this.ensureGuild(guildId);

		return await this.cache.get(guildId)!.getUser(userId);
	}

	async getRank(guildId: string, userId: string) {
		await this.waitForState(ELoadableState.ACTIVE);

		this.ensureGuild(guildId);

		return this.cache.get(guildId)!.getUserRank(userId);
	}

	async onMessageCreate(message: Message) {
		if (
			!(
				this.bot.user !== message.author &&
				!message.author.bot &&
				message.member
			)
		)
			return;

		try {
			const levelingOptions = (
				await bus.database.getGuild(message.member.guild.id)
			).raw.level_opts;

			if (
				!levelingOptions.get('location') ||
				levelingOptions.get('location') === EOptsKeyLocation.NONE
			) {
				return;
			}

			if (
				await this.addXp(
					message.member.guild.id,
					message.author.id,
					randInt(5, 10)
				)
			) {
				const userData = await this.getLevelData(
					message.member.guild.id,
					message.author.id
				);
				const levelUpMsg =
					'{username} Just leveled up'
						.replace(/{user}/gi, `<@${message.author.id}>`)
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
			console.error(error);
		}
	}

	override async onDestroy() {
		await Promise.allSettled(
			Array.from(this.cache.values()).map((c) => c.onDestroy())
		);
		this.bot.off('messageCreate', this.onMessageCreateCallback);
	}
}
