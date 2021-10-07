const fs = require('fs');


class parsedCommand {
    constructor(message,commandInfo)
    {
        this.message = message;
        this.commandInfo = commandInfo;
    }

    async executeCommand()
    {
        console.log('Not Implemented');
    }
}



module.exports.commandParser = class commandParser {

    constructor(config,settings) {

        this.config = config;
        this.settings = settings;
        this.IsCommand = false;
    }

    parseCommand(message){

        const content = message.content;
        const settings = this.settings();
        let prefix = '?';
        
        if(message.channel.type != "DM")
        {

            const hasLoggedServer = settings['servers'][message.guild.id.toString()];
            if(!hasLoggedServer)
            {
                settings['servers'][message.guild.id.toString()] = {
                    "custom_prefix": "?"
                }

                fs.writeFileSync('Storage/settings.json', JSON.stringify(settings,null,2));
            }
            prefix = settings['servers'][message.guild.id.toString()]['custom_prefix'];
        }


        const config = this.config();
        if(!content.startsWith(prefix))
        {
            return undefined
        }

        const contentSplit = content.split(/\s+/);
        const actualAlias = contentSplit[0].slice(prefix.length).toLowerCase();

        const actualCommand = config['CommandsAliases'][actualAlias];
        if(!actualCommand)
        {
            message.author.reply("\'" + actualAlias + "\' Is not a command");
            return undefined;
        }

        return new parsedCommand(this.message,config['Commands'][actualCommand]);
    }
    
}