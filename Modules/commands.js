const { Interaction } = require('discord.js');
const fs = require('fs');


class command {
    constructor(ctx,commandInfo,cmdKey,isInteraction,contentOnly = "") {
        this.ctx = ctx;
        this.cmdKey = cmdKey
        this.commandInfo = commandInfo;
        this.contentOnly = contentOnly;
        this.isInteraction = isInteraction;
    }

    getFunctionName() {
        return this.commandInfo.functionName;
    }

    getSyntax() {

        let syntax = "";
        syntax += '<' + this.cmdKey + '>';
        
        Object.keys(this.commandInfo.arguments).forEach(function (item, index) {
            syntax += ' <' + item + '>';
        });
        
        syntax = '\`' + syntax + '\`';
        return syntax;
    }

    getCategory() {
        return this.commandInfo.category;
    }

    getArgs() {
        return this.contentOnly.split(/\s+/);
    }

    async reply(reply)
    {
        if(this.isInteraction)
        {
            return await this.ctx.editReply(reply);
        }
        else
        {
            return await this.ctx.reply(reply);
        }
    }
}



module.exports.commandParser = class commandParser {

    constructor(getConfig, getSettings, updateSettings) {

        this.getConfig = getConfig;
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
    }

    async parseMessageCommand(message) {

        const content = message.content;
        const settings = this.getSettings();
        let prefix = '?';

        if (message.channel.type != "DM") {

            const hasLoggedServer = settings['servers'][message.guild.id.toString()];
            if (!hasLoggedServer) {
                settings['servers'][message.guild.id.toString()] = {
                    "custom_prefix": "?"
                }

                this.updateSettings(settings);
            }
            prefix = settings['servers'][message.guild.id.toString()]['custom_prefix'];
        }


        const config = this.getConfig();
        if (!content.startsWith(prefix)) {
            return undefined
        }

        const contentWithoutprefix = content.slice(prefix.length);
        const contentSplit = contentWithoutprefix.split(/\s+/);
        const actualAlias = contentSplit[0].toLowerCase();

        let actualCommand = "";

        Object.keys(config.Commands).forEach(function (key, index) {
            if (key == actualAlias) {
                actualCommand = key;
            }
        });

        if (!actualCommand) {
            message.reply("\'" + actualAlias + "\' Is not a command");
            return undefined;
        }
        

        return new command(message, config['Commands'][actualCommand],actualCommand, false,contentWithoutprefix.slice(actualAlias.length + 1));
    }

    async parseInteractionCommand(interaction) {

        const config = this.getConfig();

        let commandConfig = undefined;

        try {
            commandConfig = config['Commands'][interaction.commandName];

        } catch (error) {
            console.log(error);
            return undefined;
        }


        return new command(interaction, commandConfig,interaction.commandName,true);
    }

}
