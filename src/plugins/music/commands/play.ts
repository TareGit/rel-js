import { ECommandOptionType } from '@core/types';
import { CommandContext, SlashCommand } from '@modules/commands';
import MusicPlugin from '..';

export default class PlayCommand extends SlashCommand<MusicPlugin> {
	constructor() {
		super('play', 'Plays a given song or url', MusicPlugin.GROUP, [
			{
				name: 'url',
				description: 'The song to search for / the link to play',
				type: ECommandOptionType.STRING,
				required: true,
			},
		]);
	}

	override async execute(
		ctx: CommandContext,
		...args: unknown[]
	): Promise<void> {
		this.plugin?.playSource(
			ctx,
			ctx.asSlashContext.options.getString(this.options[0].name, true)
		);
	}
}

/*

if (!ctx.command.guild || !(ctx.command.member as GuildMember | null)?.voice?.channel || !ctx.command.guild.me) return utils.reply(ctx, "You need to be in a voice channel to use this command");

        if (!ctx.command.guild.me.permissions.has('CONNECT')) return utils.reply(ctx, "I dont have permissions to join voice channels.");

        if (!ctx.command.guild.me.permissions.has('SPEAK')) return utils.reply(ctx, "I dont have permissions to speak in voice channels (play music).");

*/
