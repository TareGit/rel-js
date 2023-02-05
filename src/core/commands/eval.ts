import { ECommandOptionType } from "../types";
import axios from 'axios';
import * as utils from '@core/utils';
import { SlashCommand, CommandContext } from '@modules/commands';

export default class EvalCommand extends SlashCommand {
    constructor() {
        super(
            'eval',
            'You may look, but you may not touch',
            '',
            [
                {
                    name: 'expression',
                    description: 'The Expression to Eval',
                    type: ECommandOptionType.STRING,
                    required: true
                }
            ]
        )
    }
    async execute(ctx: CommandContext, targetCommand = ""): Promise<void> {

        const userId = ctx.asSlashContext.user.id;

        if (userId !== process.env.CREATOR_ID) return ctx.reply({ content: this.description, ephemeral: true });

        await ctx.deferReply()

        const expression = ctx.asSlashContext.options.getString(this.options[0].name);

        try {
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;

            const evalFunction = new AsyncFunction('ctx', 'bus', 'utils', 'axios', 'require', expression);
            const result = await evalFunction(ctx, bus, utils, axios, require);
            const response = '```' + JSON.stringify(result) + '```';
            if (!response || !response.length) {
                await ctx.editReply({ content: '\`\`\` Evaluated Successfuly \`\`\`' })
                return;
            };

            if (!response || !response.length) {
                await ctx.editReply({ content: `\`\`\` ${response} \`\`\`` })
                return;
            };

            ctx.editReply({ content: response });

        } catch (error) {
            await ctx.editReply({ content: `\`\`\` ${error} \`\`\`` })
        }
    }
}