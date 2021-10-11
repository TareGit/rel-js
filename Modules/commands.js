const fs = require('fs');


class parsedCommand {
    constructor(message, commandInfo, contentOnly) {
        this.message = message;
        this.commandInfo = commandInfo;
        this.contentOnly = contentOnly;
    }

    getFunctionName() {
        return this.commandInfo['functionName'];
    }

    getSyntax() {
        return this.commandInfo['syntax'];
    }

    getCategory() {
        return this.commandInfo['category'];
    }

    getArgs() {
        return this.contentOnly.split(/\s+/);
    }

    getContent() {
        return this.contentOnly;
    }
}



module.exports.commandParser = class commandParser {

    constructor(getConfig, getSettings, updateSettings) {

        this.getConfig = getConfig;
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
    }

    async parseCommand(message) {

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

        Object.keys(config['Commands']).forEach(function (key, index) {
            if (key == actualAlias || config['Commands'][key]['aliases'].includes(actualAlias)) {
                actualCommand = key;
            }
        });

        console.log(actualCommand);

        if (!actualCommand) {
            message.reply("\'" + actualAlias + "\' Is not a command");
            return undefined;
        }

        return new parsedCommand(message, config['Commands'][actualCommand], contentWithoutprefix.slice(actualAlias.length + 1));
    }

}