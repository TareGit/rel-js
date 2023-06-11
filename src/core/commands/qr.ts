import { MessageEmbed } from 'discord.js';
import { ECommandOptionType, IWallpaperzWallpaper } from '@core/types';
import axios from 'axios';
import { CommandContext, SlashCommand } from '@modules/commands';
import { FrameworkConstants } from '@core/framework';
import { buildBasicEmbed } from '@core/utils';
import { MessageAttachment } from 'discord.js';

export default class QRCommand extends SlashCommand {
	constructor() {
		super('qr', 'Generates Qr Codes', FrameworkConstants.COMMAND_GROUPS.FUN, [
			{
				name: 'url',
				description: 'The URL for the QR code',
				type: ECommandOptionType.STRING,
				required: true,
			},
			// ,
			// {
			// 	name: 'size',
			// 	description: 'The Size of the qr code i.e. 500',
			// 	type: ECommandOptionType.INTEGER,
			// 	required: false,
			// },
			// {
			// 	name: 'url',
			// 	description: 'The URL for the QR code',
			// 	type: ECommandOptionType.STRING,
			// 	required: false,
			// },
			// {
			// 	name: 'url',
			// 	description: 'The URL for the QR code',
			// 	type: ECommandOptionType.STRING,
			// 	required: false,
			// },
		]);
	}
	async execute(ctx: CommandContext, ...args: unknown[]): Promise<void> {
		await ctx.deferReply();
		const url = ctx.asSlashContext.options.getString(
			this.options[0].name,
			true
		);
		try {
			await ctx.editReply({ content: `https://qr.oyintare.dev/${url}` });
		} catch (error) {
			console.error(error);
		}
	}
}
