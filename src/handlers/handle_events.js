const ps = require(`${process.cwd()}/passthrough.js`);
const { sync, bot,modulesLastReloadTime} = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

const chatModule = sync.require('./handle_chat');
const parser = sync.require('./handle_commands');
const guildDataModule = sync.require('./handle_guild_data');

const fs = require('fs');



const serviceAccountCredentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));

const chatBotManagerInstance = new chatModule.ChatBotManager(serviceAccountCredentials['project_id']);

async function onMessageCreate(message) {
    if (message.author.id === bot.user.id) return;

    const commandToExecute = await parser.parseMessage(message);

    if (commandToExecute == undefined) {

        const messageContent = message.content;
        if (message.channel.type === "DM" || messageContent.toLowerCase().split(/\s+/)[0] === 'umeko' || messageContent.toLowerCase().split(/\s+/)[0] ==='meko' ) {
            await chatBotManagerInstance.processIntents(message);
        }
        else {
            if (message.reference) {
                const repliedTo = await message.channel.messages.fetch(message.reference.messageId);

                if (repliedTo) {
                    if (repliedTo.author.id === bot.user.id) {
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
    if (newMember.id == bot.user.id) {

        if (newMember.displayName.toLowerCase() != 'Umeko') {
            newMember.setNickname('Umeko');
        }
        
    }
}

async function onGuildCreate(guild) {
    guildDataModule.joinedNewGuild(guild);
}

async function onPresenceUpdate(oldPresence, newPresence) {
    console.log(newPresence.activity.id)
}


const botEvents = [
    { id: 'messageCreate', event: onMessageCreate },
    { id: 'interactionCreate', event: onInteractionCreate },
    { id: 'guildMemberUpdate', event: onGuildMemberUpdate },
    { id: 'guildCreate', event: onGuildCreate },
    { id: 'presenceUpdate', event: onPresenceUpdate }
]

if(bot !== undefined)
{
    if (ps.botEvents !== undefined) {
        const previousEvents = ps.botEvents;
    
        previousEvents.forEach(function (botEvent, index) {
            try {
                bot.removeListener(botEvent.id, botEvent.event);
            } catch (error) {
                console.log(error);
            }
        });
    
    }
    
    botEvents.forEach(function (botEvent, index) {
        try {
            bot.on(botEvent.id, botEvent.event);
        } catch (error) {
            console.log(error);
        }
    });
    
    ps.botEvents = botEvents;
}

console.log('Events Module Online');

if(modulesLastReloadTime.events !== undefined)
{
    
}

modulesLastReloadTime.events = bot.uptime;




