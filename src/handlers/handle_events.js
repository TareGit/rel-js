const ps = require(`${process.cwd()}/passthrough`);

const chatModule = ps.sync.require('./handle_chat');
const parser = ps.sync.require('./handle_commands');
const guildDataModule = ps.sync.require('./handle_guild_data');

const fs = require('fs');



const serviceAccountCredentials = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));

const chatBotManagerInstance = new chatModule.ChatBotManager(serviceAccountCredentials['project_id']);

ps.bot.on('messageCreate', async (message) => {

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




});

ps.bot.on('interactionCreate', async (interaction) => {
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
});



ps.bot.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.id == ps.bot.user.id) {

        if (newMember.displayName.toLowerCase() != 'rel') {
            newMember.setNickname('REL');
        }
        
    }
});

ps.bot.on('guildCreate', async (guild) => {
    guildDataModule.joinedNewGuild(guild);
});


console.log('Events Module Online');


