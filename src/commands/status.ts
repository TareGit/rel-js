import { ColorResolvable, GuildMember, MessageEmbed } from 'discord.js';
import path from 'path';
import { ECommandType, IUmekoSlashCommand } from '../types';

const { version, defaultPrimaryColor } = bus.sync.require(
    path.join(process.cwd(), "./config.json")
) as typeof import("../config.json");


const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");

import osu from 'node-os-utils';

const command: IUmekoSlashCommand = {
    name: 'status',
    category: 'General',
    description: 'Get the bot status',
    type: ECommandType.SLASH,
    dependencies: ['utils'],
    syntax: '{prefix}{name}',
    options: [],
    async execute(ctx) {

        const Embed = new MessageEmbed();
        Embed.setColor((bus.guildSettings.get(ctx.command.guild?.id || '')?.color || defaultPrimaryColor) as ColorResolvable);
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
        Embed.addField(`Shard`, `${ctx.command.guild?.shardId}`, true);
        Embed.addField(`Servers`, ` ${bus.bot!.guilds.cache.size}`, true);
        //Embed.addField(`Players`, `${queues.size}`, true);
        Embed.addField(`CPU`, `${parseInt(cpu)}%`, true);
        Embed.addField(`RAM`, `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true);

        utils.reply(ctx, { embeds: [Embed] });

    }
}

export default command;