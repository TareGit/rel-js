const fs = require('fs');
const chatbotModule = require('./modules/chatbot');
const mainBotModule = require('./modules/mainbot');
const musicBotModule = require('./modules/musicbot');
const commandsModule = require('./modules/commands');

const settingsPath = process.env.SETTINGS_PATH;
const googleServiceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const configPath = process.env.CONFIG_PATH;

const serviceAccountCredentials = JSON.parse(fs.readFileSync(googleServiceAccountPath));
const settings = JSON.parse(fs.readFileSync(settingsPath));
const config = JSON.parse(fs.readFileSync(configPath));


let commandParser = undefined;

let chatBotManagerInstance = undefined;

let mainBot = undefined;

let musicBot = undefined;

function getConfig() {
    return config;
}

function getSettings() {
    return settings;
}

function updateSettings(newSettings) {
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
}

module.exports.setup = function setup(bot) {
commandParser = new commandsModule.commandParser(getConfig, getSettings, updateSettings);

chatBotManagerInstance = new chatbotModule.ChatBotManager(serviceAccountCredentials['project_id']);

mainBot = new mainBotModule.mainBot(getConfig, getSettings, updateSettings);

musicBot = new musicBotModule.musicManager(bot);
    
}

const asyncMessageCreate = async (message) => {


    const commandToExecute = await commandParser.parseMessageCommand(message);

    if (commandToExecute == undefined) {
        const messageContent = message.content;
        if (message.channel.type == "DM" || messageContent.toLowerCase().split(/\s+/)[0] == 'rel') {
            await chatBotManagerInstance.processIntents(message);
        }
        else {
            if (message.reference) {
                const repliedTo = await message.channel.messages.fetch(message.reference.messageId);


                if (repliedTo) {
                    if (repliedTo.author.id == '804165876362117141') {
                        await chatBotManagerInstance.processIntents(message);
                    }
                }
            }
        }
    }
    else {
        try {
            switch (commandToExecute.getCategory()) {
                case 'Main':
                    await mainBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;

                case 'Music':
                    await musicBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;

                default:
                    message.reply("Command not yet implemented");
                    break;
            };
        } catch (error) {
            console.log(error);
        }

    }
}

const asyncInteractionCreate = async (interaction) => {


    const commandToExecute = await commandParser.parseInteractionCommand(interaction);

    if (commandToExecute == undefined) {
        interaction.reply("Command not yet implemented");
    }
    else {
        try {
            switch (commandToExecute.getCategory()) {
                case 'Main':
                    await mainBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;

                case 'Music':
                    await musicBot[await commandToExecute.getFunctionName()](commandToExecute);
                    break;
            };
        } catch (error) {
            console.log(error);
        }

    }
}

const asyncGuildMemberUpdate = async (bot,oldMember, newMember) => {
    if(newMember.id == bot.user.id)
    {
        if(newMember.displayName.toLowerCase() != 'rel')
        {
            const fetchedLogs = await newMember.guild.fetchAuditLogs({
                limit: 1,
                type: 'MEMBER_UPDATE',
            });

            newMember.setNickname('REL');

            // Since there's only 1 audit log entry in this collection, grab the first one
            const memberUpdateLog = fetchedLogs.entries.first();
        
            // Perform a coherence check to make sure that there's *something*
            if (!memberUpdateLog) return console.log(`${newMember.user.tag} left the guild, most likely of their own will.`);
        
            // Now grab the user object of the person who kicked the member
            // Also grab the target of this action to double-check things
            const { executor, target } = memberUpdateLog;
        
            // Update the output with a bit more information
            // Also run a check to make sure that the log returned was for the same kicked member
            if (target.id === newMember.id) {
                executor.send(`Why change my name wtho ?`);
            }
        }

    }
}

module.exports.messageCreate = function (message) {
    asyncMessageCreate(message).then(result => {
    });

}

module.exports.interactionCreate = function (interaction) {
    if (!interaction.isCommand()) {
        return;
    }

    asyncInteractionCreate(interaction).then(result => {
    });

}

module.exports.guildMemberUpdate = function (bot,oldMember, newMember) {
   asyncGuildMemberUpdate(bot,oldMember,newMember);
}