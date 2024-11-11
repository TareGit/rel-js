import { BotModule, ELoadableState } from '@core/base';
import {
	IGuildSettings,
	IDatabaseGuildSettings,
	IUserSettings,
	IDatabaseUserSettings,
	FrameworkConstants,
	OptsParser,
} from '@core/common';
import { Client, ClientConfig } from 'pg';
import createSubscriber from 'pg-listen';

const MAX_DATABASE_QUERY = 50;
const PENDING_DATA_UPDATE_FREQUENCY = 1000 * 60 * 5;

export class GuildSettings {
	raw: IGuildSettings;
	constructor(settings: IDatabaseGuildSettings | IGuildSettings) {
		if (settings.opts instanceof Array) {
			this.raw = DatabaseModule.guildFromDatabase(
				settings as IDatabaseGuildSettings
			);
		} else {
			this.raw = settings as IGuildSettings;
		}
	}

	get id() {
		return this.raw.id;
	}

	get color() {
		return (
			this.raw.bot_opts.get('color') ?? FrameworkConstants.DEFAULT_BOT_COLOR
		);
	}

	get locale() {
		return (
			this.raw.bot_opts.get('locale') ?? FrameworkConstants.DEFAULT_BOT_LOCALE
		);
	}

	get nickname() {
		return (
			this.raw.bot_opts.get('nickname') ?? FrameworkConstants.DEFAULT_BOT_NAME
		);
	}

	get data() {
		return this.raw;
	}

	get asDatabase() {
		return DatabaseModule.guildToDatabase(this.raw);
	}
}

export class UserSettings {
	raw: IUserSettings;

	constructor(settings: IDatabaseUserSettings | IUserSettings) {
		if (settings.opts instanceof Array) {
			this.raw = DatabaseModule.userFromDatabase(
				settings as IDatabaseUserSettings
			);
		} else {
			this.raw = settings as IUserSettings;
		}
	}

	get id() {
		return this.raw.id;
	}

	get cardBg() {
		return (
			this.raw.card.get('bg_url') || FrameworkConstants.DEFAULT_USER_CARD_BG
		);
	}

	get cardColor() {
		return (
			this.raw.card.get('color') || FrameworkConstants.DEFAULT_USER_CARD_COLOR
		);
	}

	get cardOpacity() {
		return (
			this.raw.card.get('opacity') ||
			FrameworkConstants.DEFAULT_USER_CARD_OPACITY
		);
	}

	get options() {
		return this.raw.opts;
	}

	get data() {
		return this.raw;
	}

	get asDatabase() {
		return DatabaseModule.userToDatabase(this.raw);
	}
}

export class DatabaseModule extends BotModule {
	pendingGuilds: Set<string> = new Set();
	pendingUsers: Set<string> = new Set();
	guilds: Map<string, GuildSettings> = new Map();
	users: Map<string, UserSettings> = new Map();
	dbConnectionInfo: ClientConfig = {
		host: process.env.DB_HOST,
		database: process.env.DB_TARGET,
		port: 5432,
		user: process.env.DB_USER,
		password: process.env.DB_PASS,
	};

	connection = new Client(this.dbConnectionInfo);

	subscriber = createSubscriber(this.dbConnectionInfo);

	static DEFAULT_GUILD_SETTINGS_INSTANCE = new GuildSettings(
		FrameworkConstants.DEFAULT_GUILD_SETTINGS
	);

	static DEFAULT_USER_SETTINGS_INSTANCE = new UserSettings(
		FrameworkConstants.DEFAULT_USER_SETTINGS
	);

	static guildFromDatabase(setting: IDatabaseGuildSettings): IGuildSettings {
		return {
			...setting,
			bot_opts: new OptsParser(setting.bot_opts),
			join_opts: new OptsParser(setting.join_opts),
			leave_opts: new OptsParser(setting.leave_opts),
			twitch_opts: new OptsParser(setting.twitch_opts),
			level_opts: new OptsParser(setting.level_opts),
			opts: new OptsParser(setting.opts),
		};
	}

	static guildToDatabase(setting: IGuildSettings): IDatabaseGuildSettings {
		return {
			...setting,
			bot_opts: setting.bot_opts.encode(),
			join_opts: setting.join_opts.encode(),
			leave_opts: setting.leave_opts.encode(),
			twitch_opts: setting.twitch_opts.encode(),
			level_opts: setting.level_opts.encode(),
			opts: setting.opts.encode(),
		};
	}

	static userFromDatabase(setting: IDatabaseUserSettings): IUserSettings {
		return {
			...setting,
			card: new OptsParser(setting.card),
			opts: new OptsParser(setting.opts),
		};
	}

	static userToDatabase(setting: IUserSettings): IDatabaseUserSettings {
		return {
			...setting,
			card: setting.card.encode(),
			opts: setting.opts.encode(),
		};
	}

	async onLoad(old?: this): Promise<void> {
		console.info('Preparing Database');
		try {
			await this.connection.connect();
			await this.subscriber.connect();
			await this.subscriber.listenTo('update_user');
			await this.subscriber.listenTo('update_guild');
			this.subscriber.events.on('error', (e) =>
				console.error('Error with database listener', e)
			);
			this.subscriber.notifications
				.on(
					'update_guild',
					(
						payload: Omit<
							IDatabaseGuildSettings,
							keyof Omit<IDatabaseGuildSettings, 'id'>
						>
					) => {
						if (this.guilds.has(payload.id)) {
							this.pendingGuilds.add(payload.id);
							console.info(`Queued Update For Guild ${payload.id}`);
						}
					}
				)
				.on(
					'update_user',
					(
						payload: Omit<
							IDatabaseUserSettings,
							keyof Omit<IDatabaseUserSettings, 'id'>
						>
					) => {
						if (this.users.has(payload.id)) {
							this.pendingUsers.add(payload.id);
							console.info(`Queued Update For User ${payload.id}`);
						}
					}
				);

			if (this.bot.guilds) {
				const guilds = Array.from(this.bot.guilds.cache.keys());
				console.info(`Fetching ${guilds.length} Guilds`);
				await this.getGuilds(guilds, true);
			}

			this.updatePendingGuilds();
			this.updatePendingUsers();
		} catch (error) {
			console.error(error);
		}

		console.info('Database Ready');
	}

	async transaction(callback: (connection: Client) => Promise<void>) {
		try {
			await this.connection.query('BEGIN');
			await callback(this.connection);
			await this.connection.query('COMMIT');
		} catch (error) {
			await this.connection.query('ROLLBACK');
			throw error;
		}
	}

	async updatePendingGuilds() {
		await this.waitForState(ELoadableState.ACTIVE);

		if (this.pendingGuilds.size > 0) {
			console.info(`Updating ${this.pendingGuilds.size} Pending Guilds`);
			(await this.fetchGuilds(Array.from(this.pendingGuilds), true)).forEach(
				(d) => this.addGuildSettings(new GuildSettings(d))
			);
			this.pendingGuilds.clear();
		}

		setTimeout(
			this.updatePendingGuilds.bind(this),
			PENDING_DATA_UPDATE_FREQUENCY
		);
	}

	addPendingGuilds(ids: string[]) {
		for (let i = 0; i < ids.length; i++) {
			this.pendingGuilds.add(ids[i]);
		}
	}

	async updatePendingUsers() {
		await this.waitForState(ELoadableState.ACTIVE);

		if (this.pendingUsers.size > 0) {
			console.info(`Updating ${this.pendingUsers.size} Pending Users`);

			(await this.fetchUsers(Array.from(this.pendingUsers), true)).forEach(
				(d) => this.addUserSettings(new UserSettings(d))
			);
			this.pendingUsers.clear();
		}

		setTimeout(
			this.updatePendingUsers.bind(this),
			PENDING_DATA_UPDATE_FREQUENCY
		);
	}

	addPendingUsers(ids: string[]) {
		for (let i = 0; i < ids.length; i++) {
			this.pendingUsers.add(ids[i]);
		}
	}

	async onGuildJoined() {
		await this.waitForState(ELoadableState.ACTIVE);
	}

	async addUserSettings(settings: UserSettings) {
		await this.waitForState(ELoadableState.ACTIVE);

		if (this.users.has(settings.id)) {
			this.users.delete(settings.id);
		}

		this.users.set(settings.id, settings);
	}

	async addGuildSettings(settings: GuildSettings) {
		await this.waitForState(ELoadableState.ACTIVE);

		if (this.guilds.has(settings.id)) {
			this.guilds.delete(settings.id);
		}

		this.guilds.set(settings.id, settings);
	}

	async fetchUsers(
		ids: string[],
		uploadMissing: boolean = false
	): Promise<IDatabaseUserSettings[]> {
		const guildsQueryResult =
			await this.connection.query<IDatabaseUserSettings>(
				`SELECT * FROM users WHERE id = ANY($1)`,
				[ids]
			);

		const usersFetched = [...guildsQueryResult.rows];

		if (uploadMissing) {
			const idsGotten = usersFetched.map((a) => a.id);
			const idsNeeded = ids.filter((a) => !idsGotten.includes(a));

			if (idsNeeded.length > 0) {
				await this.transaction(async (con) => {
					await Promise.allSettled([
						idsNeeded.map((a) => {
							const newData: IDatabaseUserSettings = {
								...FrameworkConstants.DEFAULT_USER_SETTINGS,
								id: a,
							};

							usersFetched.push(newData);

							return con.query('INSERT INTO users VALUES ($1,$2,$3)', [
								newData.id,
								newData.card,
								newData.opts,
							]);
						}),
					]);
				});
			}
		}

		return usersFetched;
	}

	async fetchGuilds(
		ids: string[],
		uploadMissing: boolean = false
	): Promise<IDatabaseGuildSettings[]> {
		const guildsQueryResult =
			await this.connection.query<IDatabaseGuildSettings>(
				`SELECT * FROM guilds WHERE id = ANY($1)`,
				[ids]
			);
		const guildsFetched = [...guildsQueryResult.rows];
		if (uploadMissing) {
			const idsGotten = guildsFetched.map((a) => a.id);
			const idsNeeded = ids.filter((a) => !idsGotten.includes(a));

			if (idsNeeded.length > 0) {
				await this.transaction(async (con) => {
					await Promise.allSettled([
						idsNeeded.map((a) => {
							const newData: IDatabaseGuildSettings = {
								...FrameworkConstants.DEFAULT_GUILD_SETTINGS,
								id: a,
							};

							guildsFetched.push(newData);

							return con.query(
								'INSERT INTO guilds VALUES ($1,$2,$3,$4,$5,$6,$7)',
								[
									newData.id,
									newData.bot_opts,
									newData.join_opts,
									newData.leave_opts,
									newData.twitch_opts,
									newData.level_opts,
									newData.opts,
								]
							);
						}),
					]);
				});
			}
		}

		return guildsFetched;
	}

	// async fetchUsers(
	// 	ids: string[],
	// 	uploadMissing: boolean = false
	// ): Promise<IDatabaseUserSettings[]> {
	// 	if (ids.length > MAX_DATABASE_QUERY) {
	// 		const tasks: ReturnType<typeof this.fetchUsers>[] = [];
	// 		const totalTasks = Math.ceil(ids.length / MAX_DATABASE_QUERY);
	// 		for (let i = 0; i < totalTasks; i++) {
	// 			const isEnd = i === totalTasks - 1;
	// 			const sliceStart = i * MAX_DATABASE_QUERY;
	// 			const batch = ids.slice(
	// 				sliceStart,
	// 				isEnd ? undefined : sliceStart + MAX_DATABASE_QUERY
	// 			);
	// 			tasks.push(this.fetchUsers(batch, uploadMissing));
	// 		}

	// 		const results = await Promise.allSettled(tasks);

	// 		return results.reduce((total, result) => {
	// 			if (result.status === 'fulfilled') {
	// 				total.push.apply(total, result.value);
	// 			}
	// 			return total;
	// 		}, [] as IDatabaseUserSettings[]);
	// 	}

	// 	const DatabaseResponse = (
	// 		await DatabaseApi.get<IUmekoApiResponse<IDatabaseUserSettings[]>>(
	// 			`/users?ids=${ids.join(',')}`
	// 		)
	// 	).data;

	// 	if (DatabaseResponse.error) {
	// 		throw new Error(DatabaseResponse.data as string);
	// 	}

	// 	const data = DatabaseResponse.data as IDatabaseUserSettings[];
	// 	if (uploadMissing) {
	// 		const idsGotten = data.map((d) => d.id);
	// 		const notFound = ids.filter((id) => !idsGotten.includes(id));
	// 		if (notFound.length > 0) {
	// 			const toDatabase = notFound.map((id) => ({
	// 				...FrameworkConstants.DEFAULT_USER_SETTINGS,
	// 				id,
	// 			}));
	// 			const uploadResponse = (
	// 				await DatabaseApi.put<IUmekoApiResponse<IDatabaseUserSettings[]>>(
	// 					'/users',
	// 					toDatabase
	// 				)
	// 			).data;

	// 			if (uploadResponse.error) {
	// 				throw new Error(uploadResponse.data);
	// 			}

	// 			data.push.apply(data, toDatabase);
	// 		}
	// 	}

	// 	ServerApi.post('/n/users', {
	// 		url: `${process.env.CLUSTER_API}/u/users`,
	// 		ids: data.map((a) => a.id),
	// 	}).catch(() => console.error('Error requesting user notifications'));

	// 	return data;
	// }

	// async fetchGuilds(
	// 	ids: string[],
	// 	uploadMissing: boolean = false
	// ): Promise<IDatabaseGuildSettings[]> {
	// 	if (ids.length > MAX_DATABASE_QUERY) {
	// 		const tasks: ReturnType<typeof this.fetchGuilds>[] = [];
	// 		const totalTasks = Math.ceil(ids.length / MAX_DATABASE_QUERY);
	// 		for (let i = 0; i < totalTasks; i++) {
	// 			const isEnd = i === totalTasks - 1;
	// 			const sliceStart = i * MAX_DATABASE_QUERY;
	// 			const batch = ids.slice(
	// 				sliceStart,
	// 				isEnd ? undefined : sliceStart + MAX_DATABASE_QUERY
	// 			);
	// 			tasks.push(this.fetchGuilds(batch, uploadMissing));
	// 		}

	// 		const results = await Promise.allSettled(tasks);

	// 		return results.reduce((total, result) => {
	// 			if (result.status === 'fulfilled') {
	// 				total.push.apply(total, result.value);
	// 			}
	// 			return total;
	// 		}, [] as IDatabaseGuildSettings[]);
	// 	}

	// 	const DatabaseResponse = (
	// 		await DatabaseApi.get<IUmekoApiResponse<IDatabaseGuildSettings[]>>(
	// 			`/guilds?ids=${ids.join(',')}`
	// 		)
	// 	).data;

	// 	if (DatabaseResponse.error) {
	// 		throw new Error(DatabaseResponse.data as string);
	// 	}

	// 	const data = DatabaseResponse.data as IDatabaseGuildSettings[];

	// 	if (uploadMissing) {
	// 		const idsGotten = data.map((d) => d.id);
	// 		const notFound = ids.filter((id) => !idsGotten.includes(id));
	// 		if (notFound.length > 0) {
	// 			const toDatabase = notFound.map((id) => ({
	// 				...FrameworkConstants.DEFAULT_GUILD_SETTINGS,
	// 				id,
	// 			}));
	// 			const uploadResponse = (
	// 				await DatabaseApi.put<IUmekoApiResponse>('/guilds', toDatabase)
	// 			).data;
	// 			if (uploadResponse.error) {
	// 				throw new Error(uploadResponse.data as string);
	// 			}
	// 			data.push.apply(data, toDatabase);
	// 		}
	// 	}

	// 	ServerApi.post('/n/guilds', {
	// 		url: `${process.env.CLUSTER_API}/u/guilds`,
	// 		ids: data.map((a) => a.id),
	// 	}).catch(() => console.error('Error requesting guilds notifications'));

	// 	return data;
	// }

	async getUsers(ids: string[], bFetchIfNotFound: boolean = false) {
		const notFound: string[] = [];
		const result = ids.reduce((total, user) => {
			if (this.users.has(user)) {
				total.push(this.users.get(user)!);
			} else {
				notFound.push(user);
			}

			return total;
		}, [] as UserSettings[]);

		if (notFound.length > 0 && bFetchIfNotFound) {
			const fetchedData = (await this.fetchUsers(ids, true)).map(
				(a) => new UserSettings(a)
			);
			result.push.apply(result, fetchedData);
			fetchedData.forEach((a) => this.addUserSettings(a));
		}

		return result;
	}

	async getGuilds(ids: string[], bFetchIfNotFound: boolean = false) {
		const notFound: string[] = [];
		const result = ids.reduce((total, guild) => {
			if (this.guilds.has(guild)) {
				total.push(this.guilds.get(guild)!);
			} else {
				notFound.push(guild);
			}

			return total;
		}, [] as GuildSettings[]);

		if (notFound.length > 0 && bFetchIfNotFound) {
			const fetchedData = (await this.fetchGuilds(ids, true)).map(
				(a) => new GuildSettings(a)
			);
			result.push.apply(result, fetchedData);
			fetchedData.forEach((a) => this.addGuildSettings(a));
		}

		return result;
	}

	async getGuild(
		id: string | null | undefined,
		bFetchIfNotFound: boolean = false
	) {
		if (!id) {
			return DatabaseModule.DEFAULT_GUILD_SETTINGS_INSTANCE;
		}

		return (
			(await this.getGuilds([id], bFetchIfNotFound))[0] ??
			DatabaseModule.DEFAULT_GUILD_SETTINGS_INSTANCE
		);
	}

	async getUser(
		id: string | null | undefined,
		bFetchIfNotFound: boolean = false
	) {
		if (!id) {
			return DatabaseModule.DEFAULT_USER_SETTINGS_INSTANCE;
		}

		return (
			(await this.getUsers([id], bFetchIfNotFound))[0] ||
			DatabaseModule.DEFAULT_USER_SETTINGS_INSTANCE
		);
	}

	override onDestroy() {
		console.info('Shutting down');
		this.subscriber.close();
	}
}
