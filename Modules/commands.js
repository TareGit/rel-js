const { Interaction } = require('discord.js');
const fs = require('fs');


class command {
    constructor(ctx, commandInfo, cmdKey, type, contentOnly = "") {
        this.ctx = ctx;
        this.cmdKey = cmdKey
        this.commandInfo = commandInfo;
        this.contentOnly = contentOnly;
        this.type = type;
        this.deferred = false;
    }

    getFunctionName() {
        return this.commandInfo.functionName;
    }

    getSyntax() 
    {
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

    async deferReply() {
        if (this.type == "MESSAGE") return
        
        this.deferred = true;
        console.log("DEFERRED")
        return await this.ctx.deferReply();

    }

    async reply(reply) {
        if (this.type != "MESSAGE") {
            if (this.deferred) {
                return await this.ctx.editReply(reply);
            }
            else {
                return await this.ctx.reply(reply);
            }

        }
        else {
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

    /*
    Parse a possible message command
    */
    async parseMessageCommand(message) {

        const content = message.content;
        const settings = this.getSettings();
        let prefix = 'rel';

        //  need to change to remove custom prefixes
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


        return new command(message, config['Commands'][actualCommand], actualCommand, 'MESSAGE', contentWithoutprefix.slice(actualAlias.length + 1));
    }

    /*
    Parse an interaction command
    */
    async parseInteractionCommand(interaction) {

        const config = this.getConfig();

        let commandConfig = undefined;

        // fetch the config
        try {
            commandConfig = config['Commands'][interaction.commandName];
            if (commandConfig == undefined) {
                const commandRoute = config['Routes'][interaction.commandName];

                if (commandRoute != undefined) {
                    commandConfig = config['Commands'][commandRoute];
                }

                if (commandConfig == undefined) {
                    return undefined;
                }
            }
        } catch (error) {
            console.log(error);
            // something went wrong fetching the config
            return undefined;
        }

        if (interaction.isContextMenu()) return new command(interaction, commandConfig, interaction.commandName, 'CONTEXT_MENU');

        return new command(interaction, commandConfig, interaction.commandName, 'COMMAND');

    }

}
