import osu from 'node-os-utils';
import { SlashCommand, CommandContext } from '@modules/commands';
import { FrameworkConstants } from '@core/framework';
import { buildBasicEmbed } from '@core/utils';

function pad(s: number) {
	return (s < 10 ? '0' : '') + s;
}

export default class StatusCommand extends SlashCommand {
	constructor() {
		super(
			'status',
			'Get The Bot Status',
			FrameworkConstants.COMMAND_GROUPS.GENERAL
		);
	}
	async execute(ctx: CommandContext, ...args: unknown[]): Promise<void> {
		await ctx.deferReply();

		const Embed = await buildBasicEmbed(ctx);
		Embed.setTitle('Status');
		Embed.setURL(process.env.WEBSITE!);

		let cpu = await osu.cpu.usage();

		const seconds = (bus.bot!.uptime || 1000) / 1000;
		const secondsUp = Math.round(Math.floor(seconds % 60));

		const minutsUp = Math.round(Math.floor((seconds / 60) % 60));

		const hoursUp = Math.round(Math.floor((seconds / 3600) % 24));

		const daysUp = Math.round(Math.floor(seconds / 86400));

		Embed.addFields([
			{
				name: `Uptime`,
				value: ` ${daysUp} Day${daysUp === 1 ? '' : 's'} ${pad(hoursUp)} Hr${
					hoursUp === 1 ? '' : 's'
				} ${pad(minutsUp)} Min ${pad(secondsUp)}Secs`,
			},
			{
				name: 'Cluster',
				value: `${bus.cluster!.id}`,
				inline: true,
			},
			{
				name: 'Shard',
				value: `${ctx.asSlashContext.guild?.shardId}`,
				inline: true,
			},
			{
				name: 'Servers',
				value: `${bus.bot!.guilds.cache.size}`,
				inline: true,
			},
			{
				name: 'CPU Load',
				value: `${cpu}%`,
				inline: true,
			},
			{
				name: 'RAM Usage',
				value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(
					2
				)} MB`,
				inline: true,
			},
		]);

		ctx.editReply({ embeds: [Embed] });
	}
}
