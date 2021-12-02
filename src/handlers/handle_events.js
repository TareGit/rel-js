const ps = require(`${process.cwd()}/passthrough`);

const chatModule = ps.sync.require('./handle_chat');
const parser = ps.sync.require('./handle_commands');
const guildDataModule = ps.sync.require('./handle_guild_data');

const fs = require('fs');



const serviceAccountCredentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));

const chatBotManagerInstance = new chatModule.ChatBotManager(serviceAccountCredentials['project_id']);

async function onMessageCreate(message) {
    if (message.author.id === ps.bot.user.id) return;

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

async function onInteractionCreate(interaction) {
    if (!interaction.isCommand() && !interaction.isContextMenu()) {
        return;
    }

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

async function onGuildMemberUpdate(oldMember, newMember) {
    if (newMember.id == ps.bot.user.id) {

        if (newMember.displayName.toLowerCase() != 'rel') {
            newMember.setNickname('REL');
        }
        
    }
}

async function onGuildCreate(guild) {
    guildDataModule.joinedNewGuild(guild);
}


const botEvents = [
    { id: 'messageCreate', event: onMessageCreate },
    { id: 'interactionCreate', event: onInteractionCreate },
    { id: 'guildMemberUpdate', event: onGuildMemberUpdate },
    { id: 'guildCreate', event: onGuildCreate }
]

if(ps.bot !== undefined)
{
    if (ps.botEvents !== undefined) {
        const previousEvents = ps.botEvents;
    
        previousEvents.forEach(function (botEvent, index) {
            try {
                ps.bot.removeListener(botEvent.id, botEvent.event);
            } catch (error) {
                console.log(error);
            }
        });
    
    }
    
    botEvents.forEach(function (botEvent, index) {
        try {
            ps.bot.on(botEvent.id, botEvent.event);
        } catch (error) {
            console.log(error);
        }
    });
    
    ps.botEvents = botEvents;
}



console.log('Events Module Online');


