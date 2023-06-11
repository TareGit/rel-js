import {
	Interaction,
	BaseCommandInteraction,
	Message,
	CommandInteraction,
	ContextMenuInteraction,
	UserContextMenuInteraction,
	InteractionDeferReplyOptions,
	InteractionReplyOptions,
	MessagePayload,
	WebhookEditMessageOptions,
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import {
	ECommandOptionType,
	ECommandType,
	ICommandOption,
	IDiscordApiCommand,
} from '@core/types';
import { BotModule, ELoadableState, Loadable } from '@core/base';
import axios from 'axios';
import util from 'util';
import { BotPlugin } from './plugins';
import { FrameworkConstants } from '@core/framework';
import { FSWatcher, watch } from 'chokidar';
export class CommandContext {
	ctx: BaseCommandInteraction;
	constructor(ctx: BaseCommandInteraction) {
		this.ctx = ctx;
	}

	get type() {
		if (this.ctx.isCommand()) {
			return ECommandType.SLASH;
		} else if (this.ctx.isUserContextMenu()) {
			return ECommandType.USER_CONTEXT_MENU;
		}

		return ECommandType.CHAT_CONTEXT_MENU;
	}

	get asSlashContext() {
		return this.ctx as CommandInteraction;
	}

	get asChatContext() {
		return this.ctx as ContextMenuInteraction;
	}

	get asUserContext() {
		return this.ctx as UserContextMenuInteraction;
	}

	get deferred() {
		return this.ctx.deferred;
	}

	async deferReply(opts?: InteractionDeferReplyOptions) {
		return await this.ctx.deferReply(opts);
	}

	async reply(opts: InteractionReplyOptions) {
		return await this.ctx.reply(opts);
	}

	async editReply(opts: string | MessagePayload | WebhookEditMessageOptions) {
		if (!this.ctx.deferred && this.ctx.channel) {
			return await this.ctx.channel.send(opts);
		}

		return await this.ctx.editReply(opts);
	}
}

abstract class CommandBase<P extends BotPlugin = BotPlugin> extends Loadable {
	name: string;
	type: ECommandType = ECommandType.CHAT_CONTEXT_MENU;
	description: string;
	dependencies: string[];
	plugin: P | null = null;

	constructor(name: string, desc: string, deps: string[]) {
		super();
		this.name = name;
		this.description = desc;
		this.dependencies = deps;
	}

	setPlugin(plugin: P) {
		this.plugin = plugin;
	}

	async execute(ctx: CommandContext, ...args: unknown[]) {
		throw new Error('Execute not implemented');
	}

	override async load(old?: this) {
		await super.load(old);
	}

	toJson() {
		return {
			name: this.name,
			type: this.type,
			description: this.description,
		};
	}

	get uniqueId() {
		return `${this.type}${this.name}`;
	}
}

abstract class CommandWithOptions<
	P extends BotPlugin = BotPlugin
> extends CommandBase<P> {
	options: ICommandOption[];
	constructor(
		name: CommandBase['name'],
		desc: CommandBase['description'],
		options: ICommandOption[],
		deps: CommandBase['dependencies']
	) {
		super(name, desc, deps);
		this.options = options;
	}
}

export abstract class SlashCommand<
	P extends BotPlugin = BotPlugin
> extends CommandWithOptions<P> {
	group: string;
	constructor(
		name: CommandWithOptions['name'],
		desc: CommandWithOptions['description'],
		group: string = '',
		options: CommandWithOptions['options'] = [],
		deps: CommandWithOptions['dependencies'] = []
	) {
		super(name, desc, options, deps);
		this.group = group;
		this.type = ECommandType.SLASH;
	}

	toJson() {
		return { ...CommandBase.prototype.toJson(), options: this.options };
	}
}

export abstract class UserContextMenuCommand<
	P extends BotPlugin = BotPlugin
> extends CommandWithOptions<P> {
	constructor(
		name: CommandWithOptions['name'],
		desc: CommandWithOptions['description'],
		options: CommandWithOptions['options'],
		deps: CommandWithOptions['dependencies']
	) {
		super(name, desc, options, deps);
		this.type = ECommandType.USER_CONTEXT_MENU;
	}
}

export abstract class ChatContextMenuCommand<
	P extends BotPlugin = BotPlugin
> extends CommandBase<P> {
	constructor(
		name: CommandWithOptions['name'],
		desc: CommandWithOptions['description'],
		deps: CommandWithOptions['dependencies']
	) {
		super(name, desc, deps);
		this.type = ECommandType.CHAT_CONTEXT_MENU;
	}
}

export class CommandsModule extends BotModule {
	static FILE_UPDATE_TIMEOUT = 1000 * 10;
	commands: Map<string, CommandBase> = new Map();
	pathsToCommands: Map<string, CommandBase> = new Map();
	slashCommands: Map<string, SlashCommand> = new Map();
	pendingFileUpdate: Map<string, ReturnType<typeof setTimeout>> = new Map();
	userContextMenuCommands: Map<string, UserContextMenuCommand> = new Map();
	chatContextMenuCommands: Map<string, ChatContextMenuCommand> = new Map();
	watcher: FSWatcher;
	onCommandFileAddedCallback: (path: string, stats: fs.Stats) => Promise<void>;
	onCommandFileChangedCallback: (
		path: string,
		stats?: fs.Stats | undefined
	) => Promise<void>;
	onCommandFileDeletedCallback: (path: string) => Promise<void>;

	interactionCreateCallback: (interaction: Interaction) => Promise<void> =
		this.onInteractionCreate.bind(this);

	get coreCommandsPath() {
		return path.join(PATH_CORE, 'commands');
	}

	constructor() {
		super();
		this.watcher = watch([], {});
		this.onCommandFileAddedCallback = this.onCommandFileAdded.bind(this);
		this.onCommandFileChangedCallback = this.onCommandFileChanged.bind(this);
		this.onCommandFileDeletedCallback = this.onCommandFileDeleted.bind(this);
	}

	async onCommandFileAdded(path: string, stats: fs.Stats) {
		if (this.pathsToCommands.has(path)) return;
		console.info('Command Path Added', path);
	}

	async onCommandFileChanged(path: string, stats?: fs.Stats | undefined) {
		if (this.pendingFileUpdate.has(path)) {
			console.info('Refreshing pending File update');
			this.pendingFileUpdate.get(path)!.refresh();
			return;
		}

		console.info('Adding Pending File update');

		// to account for multiple file updates at the same time so we wait till the latest version
		await new Promise((r) =>
			this.pendingFileUpdate.set(
				path,
				setTimeout(r, CommandsModule.FILE_UPDATE_TIMEOUT)
			)
		);

		if (this.pathsToCommands.has(path)) {
			const command = this.pathsToCommands.get(path)!;
			if (command.state === ELoadableState.DESTROYING) {
				return;
			}
			await command.destroy();
			await this.importCommand(path, command.plugin, false);

			this.pendingFileUpdate.delete(path);
		}
	}

	async onCommandFileDeleted(path: string) {}

	async onLoad(old?: this): Promise<void> {
		console.info('Preparing Commands');

		this.watcher.on('add', this.onCommandFileAddedCallback);
		this.watcher.on('change', this.onCommandFileChangedCallback);
		this.watcher.on('unlink', this.onCommandFileDeletedCallback);

		this.bot.on('interactionCreate', this.interactionCreateCallback);
		const commandsToImport = await fs.promises.readdir(this.coreCommandsPath);
		for (let i = 0; i < commandsToImport.length; i++) {
			await this.importCommand(
				path.join(this.coreCommandsPath, commandsToImport[i])
			);
		}

		console.info('Commands Ready');
	}

	async onMessageCreate(message: Message) {
		if (!(this.bot.user === message.author) || message.author.bot) return;

		try {
			if (
				message.mentions.users.has(this.bot.user.id) &&
				message.content &&
				message.content.split('>')[1]
			) {
				const argument = message.content.split('>')[1].trim().toLowerCase();
				if (argument === '' || argument === 'help') {
				}
			}
		} catch (error: any) {
			console.error(error);
		}
	}

	static COMMAND_GROUPS = Object.values(FrameworkConstants.COMMAND_GROUPS);

	async onInteractionCreate(interaction: Interaction) {
		try {
			if (!interaction.isCommand() && !interaction.isContextMenu()) {
				return;
			}

			let command: CommandBase | undefined = undefined;
			console.info('New interaction', interaction.commandName);
			if (interaction.isCommand()) {
				if (interaction.options.getSubcommand(false)) {
					command = this.slashCommands.get(interaction.options.getSubcommand());
				} else {
					command = this.slashCommands.get(interaction.commandName);
				}
			} else if (interaction.isUserContextMenu()) {
				command = this.userContextMenuCommands.get(interaction.commandName);
			} else if (interaction.isContextMenu()) {
				command = this.chatContextMenuCommands.get(interaction.commandName);
			}

			if (command) {
				await command.execute(new CommandContext(interaction));
			}
		} catch (error: any) {
			console.error(error);
		}
	}

	async addCommand(command: CommandBase) {
		const existingCommand = this.commands.get(command.uniqueId);

		this.commands.set(command.uniqueId, command);

		switch (command.type) {
			case ECommandType.CHAT_CONTEXT_MENU:
				await this.addChatContextMenuCommand(command as ChatContextMenuCommand);
				break;
			case ECommandType.SLASH:
				await this.addSlashCommand(command as SlashCommand);
				break;
			case ECommandType.USER_CONTEXT_MENU:
				await this.addUserContextMenuCommand(command as UserContextMenuCommand);
				break;
			default:
				break;
		}

		if (existingCommand) {
			await command.load(existingCommand);
		} else {
			await command.load();
		}
	}

	private async addChatContextMenuCommand(command: ChatContextMenuCommand) {
		if (this.chatContextMenuCommands.has(command.name)) {
			await this.chatContextMenuCommands.get(command.name)!.destroy();
		}

		this.chatContextMenuCommands.set(command.name, command);
	}

	private async addSlashCommand(command: SlashCommand) {
		if (this.slashCommands.has(command.name)) {
			await this.slashCommands.get(command.name)!.destroy();
		}

		this.slashCommands.set(command.name, command);
	}

	private async addUserContextMenuCommand(command: UserContextMenuCommand) {
		if (this.userContextMenuCommands.has(command.name)) {
			await this.userContextMenuCommands.get(command.name)!.destroy();
		}

		this.userContextMenuCommands.set(command.name, command);
	}

	async importCommand(
		importPath: string,
		plugin: BotPlugin | null = null,
		bWatch = true
	) {
		if (!importPath.endsWith('.js')) return;

		if (this.pathsToCommands.has(importPath)) {
			delete require.cache[require.resolve(importPath)];
		}

		try {
			const command: CommandBase = new (require(importPath).default)();

			if (plugin) {
				command.setPlugin(plugin);
			}

			await this.addCommand(command);

			if (bWatch) {
				this.pathsToCommands.set(importPath, command);
				this.watcher.add(importPath);
			}
		} catch (error) {
			console.info(`Error loading ${importPath}\x1b[0m\n`, error);
		}
	}

	getSlashCommand(id: string) {
		return this.slashCommands.get(id);
	}

	getUserContextMenuCommand(id: string) {
		return this.userContextMenuCommands.get(id);
	}

	getChatContextMenuCommand(id: string) {
		return this.userContextMenuCommands.get(id);
	}

	export() {
		const commandsToExport: IDiscordApiCommand[] = [];
		const groups: { [group: string]: IDiscordApiCommand } = {};

		this.slashCommands.forEach((command) => {
			if (command.group.length > 0) {
				if (!groups[command.group]) {
					groups[command.group] = {
						name: command.group,
						description: `${command.group} interface`,
						options: [],
					};
				}

				(groups[command.group].options as IDiscordApiCommand[]).push({
					name: command.name,
					description: command.description,
					options: command.options,
					type: ECommandOptionType.SUB_COMMAND,
				});
			} else {
				commandsToExport.push({
					name: command.name,
					description: command.description,
					options: command.options,
					type: command.type,
				});
			}
		});

		commandsToExport.push.apply(commandsToExport, Object.values(groups));

		commandsToExport.push.apply(
			commandsToExport,
			Array.from(this.userContextMenuCommands.values()).map((com) => ({
				name: com.name,
				type: com.type,
			}))
		);

		commandsToExport.push.apply(
			commandsToExport,
			Array.from(this.chatContextMenuCommands.values()).map((com) => ({
				name: com.name,
				type: com.type,
			}))
		);

		return commandsToExport;
	}

	async uploadCommands(guild?: string) {
		const payload = this.export();

		const config = {
			headers: {
				Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
			},
		};
		try {
			if (guild) {
				return (
					await axios.put(
						`https://discord.com/api/v10/applications/${this.bot.user?.id}/guilds/${guild}/commands`,
						payload,
						config
					)
				).data;
			} else {
				return (
					await axios.put(
						`https://discord.com/api/v10/applications/${this.bot.user?.id}/commands`,
						payload,
						config
					)
				).data;
			}
		} catch (error: any) {
			if (error.isAxiosError) {
				console.error(
					'error uploading',
					util.inspect(error.response.data.errors, true, 1000)
				);
			} else {
				console.error('Error uploading Slash Commands', error);
			}
		}
	}

	override async onDestroy(): Promise<void> {
		this.watcher.off('add', this.onCommandFileAddedCallback);
		this.watcher.off('change', this.onCommandFileChangedCallback);
		this.watcher.off('unlink', this.onCommandFileDeletedCallback);
	}
}
