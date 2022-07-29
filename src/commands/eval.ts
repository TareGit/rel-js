import { CommandInteraction } from "discord.js";
import path from "path";
import { IUmekoSlashCommand, ECommandType, EUmekoCommandContextType, IParsedMessage, ECommandOptionType } from "../types";
import axios from 'axios';

const utils = bus.sync.require(
    path.join(process.cwd(), "utils")
) as typeof import("../utils");



const command: IUmekoSlashCommand = {
    name: 'eval',
    type: ECommandType.SLASH,
    dependencies: ['utils'],
    category: 'Development',
    description: 'You may look, but you may not touch!',
    syntax: '{prefix}{name} <expression>',
    options: [
        {
            name: 'expression',
            description: 'The Expression to Eval',
            type: ECommandOptionType.STRING,
            required: true
        }
    ],
    async execute(ctx) {

        const userId = ctx.type == EUmekoCommandContextType.CHAT_MESSAGE ? (ctx.command as IParsedMessage).author.id : (ctx.command as CommandInteraction).user.id;

        if (userId !== process.env.CREATOR_ID) return utils.reply(ctx, { content: this.description, ephemeral: true });

        const expression = ctx.type == EUmekoCommandContextType.CHAT_MESSAGE ? (ctx.command as IParsedMessage).pureContent : (ctx.command as CommandInteraction).options.getString('expression');

        try {
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

            const evalFunction = new AsyncFunction('ctx', 'bus', 'utils', 'axios', 'require', expression);
            const result = await evalFunction(ctx, bus, utils, axios, require);
            const response = '```' + JSON.stringify(result) + '```';
            if (!response) return utils.reply(ctx, '\`The result of the evaluation was undefined\`');
            if (!response.length) return utils.reply(ctx, '\`The evaluation did not return a result\`');

            utils.reply(ctx, response);
        } catch (error) {
            utils.reply(ctx, '```ERROR :: ' + error.message + '```').catch(utils.log);
            utils.log(`Error Executing Evaluation "${expression}"`, error);
        }
    }
}

export default command;