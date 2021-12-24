const ps = require(`${process.cwd()}/passthrough.js`);
const { sync, bot,modulesLastReloadTime} = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

const parser = sync.require('./handle_commands');
const guildDataModule = sync.require('./handle_guild_data');

const fs = require('fs');



const serviceAccountCredentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));

async function onMessageCreate(message) {
    if (message.author.id === bot.user.id) return;

    const commandToExecute = await parser.parseMessage(message).catch((error) => logError(`Error parsing message`,error));

    if (commandToExecute !== undefined) {
        commandToExecute.execute(message).catch((error) => {
            console.log(`\nError Executing Message Command\n`)
            console.log(error);
        });
    }
}

async function onInteractionCreate(interaction) {
    if (!interaction.isCommand() && !interaction.isContextMenu()) {
        return;
    }

    const commandToExecute = await parser.parseInteractionCommand(interaction).catch((error) => logError(`Error parsing interaction`,error));

    if (commandToExecute == undefined) {
        interaction.reply("Command not yet implemented");
    }
    else {
        commandToExecute.execute(interaction).catch((error) => {
            console.log(`\nError Executing Interaction Command\n`)
            console.log(error);
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
                logError(`Error unbinding event ${botEvent.id} from bot`,error);
            }
        });
    
    }
    
    botEvents.forEach(function (botEvent, index) {
        try {
            bot.on(botEvent.id, botEvent.event);
        } catch (error) {
            logError(`Error binding event ${botEvent.id} to bot`,error);
        }
    });
    
    ps.botEvents = botEvents;
}

console.log("\x1b[32m",'Events Module Online\x1b[0m');

if(modulesLastReloadTime.events !== undefined)
{
    
}

modulesLastReloadTime.events = bot.uptime;




