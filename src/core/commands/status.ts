import { ColorResolvable, GuildMember, MessageEmbed } from 'discord.js';
import path from 'path';
import { ECommandOptionType, ECommandType, IWallpaperzWallpaper } from '../types';
import osu from 'node-os-utils';
import { SlashCommand, CommandContext } from '@modules/commands';
import constants from '@core/constants';
import { log } from '@core/utils';

export default class StatusCommand extends SlashCommand {
    constructor() {
        super(
            'status',
            'Get The Bot Status',
            constants.COMMAND_GROUPS.GENERAL,
        )
    }
    async execute(ctx: CommandContext, ...args: any[]): Promise<void> {
        await ctx.deferReply();

        const Embed = new MessageEmbed();
        Embed.setColor((await bus.database.getGuild(ctx.asSlashContext.guild?.id)).color as ColorResolvable);
        Embed.setTitle('Status');
        Embed.setURL(process.env.WEBSITE!);

        let cpu = await osu.cpu.usage();

        function pad(s) {
            return (s < 10 ? '0' : '') + s;
        }

        const seconds = bus.bot!.uptime || 1000 / 1000;
        const secondsUp = Math.round(Math.floor(seconds % 60));

        const minutsUp = Math.round(Math.floor((seconds / 60) % 60));

        const hoursUp = Math.round(Math.floor((seconds / 3600) % 24));

        const daysUp = Math.round(Math.floor(seconds / 86400));

        Embed.addField(`Uptime`, ` ${daysUp} Day${daysUp === 1 ? "" : "s"} ${pad(hoursUp)} Hr${hoursUp === 1 ? "" : "s"} ${pad(minutsUp)} Min ${pad(secondsUp)}Secs`, false);
        Embed.addField(`Cluster`, `${bus.cluster!.id}`, true);
        Embed.addField(`Shard`, `${ctx.asSlashContext.guild?.shardId}`, true);
        Embed.addField(`Servers`, ` ${bus.bot!.guilds.cache.size}`, true);
        //Embed.addField(`Players`, `${queues.size}`, true);
        Embed.addField(`CPU`, `${parseInt(cpu)}%`, true);
        Embed.addField(`RAM`, `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true);

        ctx.editReply({ embeds: [Embed] });
    }
}