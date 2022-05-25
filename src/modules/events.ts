const dataBus = require(`${process.cwd()}/dataBus.js`);
const { sync, bot, modulesLastReloadTime, guildSettings, commands } = require(`${process.cwd()}/dataBus.js`);

const parser = sync.require('./handleCommands');
const guildDataModule = sync.require('./handleGuildData');

const utils = sync.require(`${process.cwd()}/utils`);

const fs = require('fs');


async function onMessageCreate(message) {
    try {
        if (message.author.id === bot.user.id) return;
        if (message.author.bot) return;

        if (message.mentions.users.has(bot.user.id) && message.content && message.content.split('>')[1]) {
            const argument = message.content.split('>')[1].trim().toLowerCase();
            if (argument === '' || argument === 'help') {
                message.args = ['']
                return commands.get('help').execute(message);
            }
        }

        const commandToExecute = await parser.parseMessage(message).catch((error) => utils.log(`Error parsing message\x1b[0m\n`, error));

        if (commandToExecute !== undefined) {
            commandToExecute.execute(message).catch((error) => {
                utils.log(`Error Executing Message Command\x1b[0m\n`, error)
            });
        }
    } catch (error) {
        utils.log(error);
    }

}

async function onInteractionCreate(interaction) {
    try {
        if (!interaction.isCommand() && !interaction.isContextMenu()) {
            return;
        }

        const commandToExecute = await parser.parseInteractionCommand(interaction).catch((error) => utils.log(`Error parsing interaction\x1b[0m\n`, error));

        if (commandToExecute == undefined) {
            interaction.reply("Command not yet implemented");
        }
        else {
            commandToExecute.execute(interaction).catch((error) => {
                utils.log(`Error Executing Interaction Command\x1b[0m\n`, error)
            });

        }
    } catch (error) {
        utils.log(error)
    }

}

async function onGuildMemberUpdate(oldMember, newMember) {

}

async function onGuildCreate(guild) {
    guildDataModule.onJoinedNewGuild(guild);
}


// presence update for twitch activity
async function onPresenceUpdate(oldPresence, newPresence) {

    try {
        if (!guildSettings.get(newPresence.guild.id)) return;

        const options = guildSettings.get(newPresence.guild.id).twitch_options;

        if (!options.get('location') || options.get('location') === 'disabled') return;

        const relevantNewActivities = newPresence && newPresence.activities ? newPresence.activities.filter((activity) => activity.name === 'Twitch') : [];

        const relevantOldActivities = oldPresence && oldPresence.activities ? oldPresence.activities.filter((activity) => activity.name === 'Twitch') : [];

        const bJustWentLive = relevantNewActivities.length && !relevantOldActivities.length;

        const bJustWentOffline = !relevantNewActivities.length && relevantOldActivities.length;

        if (!bJustWentLive && !bJustWentOffline) return;

        if (bJustWentLive) {
            const targetActivity = relevantNewActivities[0];

            const guildId = newPresence.guild.id;
            const userId = newPresence.member.id;
            const username = newPresence.member.displayName;
            const url = targetActivity.url;

            // Twitch online message here
            let twitchOnlineNotification = guildSettings.get(guildId).twitch_message;

            twitchOnlineNotification = twitchOnlineNotification.replace(/{user}/gi, `<@${userId}>`);
            twitchOnlineNotification = twitchOnlineNotification.replace(/{username}/gi, `${username}`);
            twitchOnlineNotification = twitchOnlineNotification.replace(/{link}/gi, `${url}`);

            if (options.get('location') === 'channel' && options.get('channel')) {

                const channel = await newPresence.guild.channels.fetch(options.get('channel')).catch(utils.log);

                if (channel) {
                    channel.send(twitchOnlineNotification);
                }
            }

            if (options.get('give')) {

                const roles = options.get('give').split(',').filter(role => !Array.from(newPresence.member.roles.cache.keys()).includes(role));

                const user = newPresence.member;

                if (roles.length) {
                    await user.roles.add(roles, 'Started Streaming').catch(utils.log);
                }
            }
        }
        else {
            if (options.get('give')) {

                const roles = options.get('give').split(',').filter(role => Array.from(newPresence.member.roles.cache.keys()).includes(role));

                const user = newPresence.member;

                if (roles.length) {
                    await user.roles.remove(roles, 'Stopped Streaming').catch(utils.log);
                }
            }
        }



    } catch (error) {
        utils.log(error);
    }

}


const botEvents = [
    { id: 'messageCreate', event: onMessageCreate },
    { id: 'interactionCreate', event: onInteractionCreate },
    { id: 'guildMemberUpdate', event: onGuildMemberUpdate },
    { id: 'guildCreate', event: onGuildCreate },
    { id: 'presenceUpdate', event: onPresenceUpdate }
]

if (bot !== undefined) {
    if (dataBus.botEvents !== undefined) {
        const previousEvents = dataBus.botEvents;

        previousEvents.forEach(function (botEvent, index) {
            try {
                bot.removeListener(botEvent.id, botEvent.event);
            } catch (error) {
                utils.log(`Error unbinding event ${botEvent.id} from bot\x1b[0m\n`, error);
            }
        });

    }

    botEvents.forEach(function (botEvent, index) {
        try {
            bot.on(botEvent.id, botEvent.event);
        } catch (error) {
            utils.log(`Error binding event ${botEvent.id} to bot\x1b[0m\n`, error);
        }
    });

    dataBus.botEvents = botEvents;
}



if (modulesLastReloadTime.events !== undefined) {
    utils.log('Events Module Reloaded\x1b[0m');
}
else {
    utils.log('Events Module Loaded\x1b[0m');
}

if (bot) {
    modulesLastReloadTime.events = bot.uptime;
}
