import { CommandContext } from '@modules/commands';
import {
	InteractionCollector as ICollector,
	Interaction,
	Client,
	InteractionCollectorOptions,
	EmbedFooterData,
	MessageEmbed,
	ColorResolvable,
} from 'discord.js';

/**
 * Generates a random float (inclusive)
 * @param min
 * @param max
 * @returns The random float
 */
export function randFloat(min: number = 0, max: number = 1) {
	return Math.random() * (max - min) + min;
}

/**
 * Generates a random integer (inclusive)
 * @param min
 * @param max
 * @returns The random integer
 */
export function randInt(min: number = 0, max: number = 1): number {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

export function time(sep = '') {
	const currentDate = new Date();

	if (sep === '') {
		return currentDate.toUTCString();
	}

	const date = ('0' + currentDate.getUTCDate()).slice(-2);

	const month = ('0' + (currentDate.getUTCMonth() + 1)).slice(-2);

	const year = currentDate.getUTCFullYear();

	const hours = ('0' + currentDate.getUTCHours()).slice(-2);

	const minutes = ('0' + currentDate.getUTCMinutes()).slice(-2);

	const seconds = ('0' + currentDate.getUTCSeconds()).slice(-2);

	return `${year}${sep}${month}${sep}${date}${sep}${hours}${sep}${minutes}${sep}${seconds}`;
}

// /**
//  * Logs stuff
//  * @param args What to log
//  */
// export function log(...args: unknown[]) {
// 	const argumentValues = Object.values(args);

// 	const stack = new Error().stack;
// 	const pathDelimiter = process.platform !== 'win32' ? '/' : '\\';
// 	const simplifiedStack = stack?.split('\n')[2].split(pathDelimiter) || [];
// 	const file =
// 		simplifiedStack[Math.max(simplifiedStack.length - 1, 0)].split(')')[0];

// 	argumentValues.unshift(`${file.padEnd(20)}::`);

// 	if (global.bus && bus.bot && bus.cluster) {
// 		const clusterText = `Cluster ${bus.cluster.id}`.padEnd(13);
// 		argumentValues.unshift(`${clusterText}::`);
// 	} else {
// 		argumentValues.unshift(`${'Manager'.padEnd(13)}::`);
// 	}

// 	argumentValues.unshift(`${new Date().toLocaleString().padEnd(22)}::`);

// 	console.log.apply(null, argumentValues);
// }

export class InteractionCollector<
	T extends Interaction,
	V = unknown
> extends ICollector<T> {
	public data: V;
	constructor(client: Client, d: V, options?: InteractionCollectorOptions<T>) {
		super(client, options);
		this.data = d;
	}
}

export async function buildBasicEmbed(
	ctx: CommandContext,
	footer?: EmbedFooterData
) {
	const embed = new MessageEmbed();
	if (footer) embed.setFooter(footer);
	embed.setColor(
		(await bus.database.getGuild(ctx.ctx.guildId)).color as ColorResolvable
	);
	return embed;
}
