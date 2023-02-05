import path from 'path';
import { ECommandOptionType } from '../types';
import { FrameworkConstants } from "@core/framework";
import { log } from '@core/utils';
import { SlashCommand, CommandContext } from '@modules/commands';

export default class HelpCommand extends SlashCommand {
    constructor() {
        super(
            'help',
            'Display help',
            FrameworkConstants.COMMAND_GROUPS.GENERAL,
            [
                {
                    name: 'command',
                    description: "The specific command to get help on",
                    type: ECommandOptionType.STRING,
                    required: false
                }
            ]
        )
    }
    async execute(ctx: CommandContext, targetCommand = ""): Promise<void> {

        ctx.reply({ content: "This command is being worked on" });
    }
}