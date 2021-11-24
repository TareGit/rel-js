const ps = require(`${process.cwd()}/passthrough`);

const chatModule = ps.sync.require('./handle_chat');
const parser = ps.sync.require('./handle_commands');

const fs = require('fs');



const serviceAccountCredentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));


let chatBotManagerInstance = undefined;


module.exports.setup = function setup() {


    chatBotManagerInstance = new chatModule.ChatBotManager(serviceAccountCredentials['project_id']);

    ps.bot.on('messageCreate', (message) => {

        if (message.author.id === ps.bot.user.id) return;
    
        asyncMessageCreate(message).then(result => {
        });
    
    });
    
    ps.bot.on('interactionCreate', (interaction) => {
        if (!interaction.isCommand() && !interaction.isContextMenu()) {
            return;
        }
    
        asyncInteractionCreate(interaction).then(result => {
        });
    });
    
    
    
    ps.bot.on('guildMemberUpdate', (oldMember, newMember) => {
        asyncGuildMemberUpdate(oldMember, newMember);
    });
}

async function asyncMessageCreate(message){

    const commandToExecute = await parser.parseMessage(message);

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
        commandToExecute.execute(message, 'MESSAGE').catch((error) => {
            console.log(error)
        });
    }



}

async function asyncInteractionCreate(interaction){


    const commandToExecute = await parser.parseInteractionCommand(interaction);

    if (commandToExecute == undefined) {
        interaction.reply("Command not yet implemented");
    }
    else {
        commandToExecute.execute(interaction, 'COMMAND').catch((error) => {
            console.log(error)
        });

    }
}

async function asyncGuildMemberUpdate(oldMember, newMember){
    
    if (newMember.id == ps.bot.user.id) {

        if (newMember.displayName.toLowerCase() != 'rel') {
            newMember.setNickname('REL');
        }

    }
}


