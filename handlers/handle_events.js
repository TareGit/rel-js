const fs = require('fs');
const chatModule = require('./handle_chat');
const parser = require('./handle_commands');

const serviceAccountCredentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));


let chatBotManagerInstance = undefined;

let bot = undefined

module.exports.setup = function setup(botIn) {

    bot = botIn;

    chatBotManagerInstance = new chatModule.ChatBotManager(serviceAccountCredentials['project_id']);

    bot.on('messageCreate', (message) => {

        if (message.author.id === bot.user.id) return;
    
        asyncMessageCreate(message).then(result => {
        });
    
    });
    
    bot.on('interactionCreate', (interaction) => {
        if (!interaction.isCommand() && !interaction.isContextMenu()) {
            return;
        }
    
        asyncInteractionCreate(interaction).then(result => {
        });
    });
    
    
    
    bot.on('guildMemberUpdate', (oldMember, newMember) => {
        asyncGuildMemberUpdate(oldMember, newMember);
    });
}

async function asyncMessageCreate(message){

    const commandToExecute = await parser.parseMessage(bot, message);

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
            commandToExecute.execute(bot, message, 'MESSAGE');
        } catch (error) {
            console.log(error);
        }

    }



}

async function asyncInteractionCreate(interaction){


    const commandToExecute = await parser.parseInteractionCommand(bot, interaction);

    if (commandToExecute == undefined) {
        interaction.reply("Command not yet implemented");
    }
    else {
        try {
            commandToExecute.execute(bot, interaction, 'COMMAND');
        } catch (error) {
            console.log(error);
        }

    }
}

async function asyncGuildMemberUpdate(oldMember, newMember){
    
    if (newMember.id == bot.user.id) {

        if (newMember.displayName.toLowerCase() != 'rel') {
            newMember.setNickname('REL');
        }

    }
}


