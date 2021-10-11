const { MessageEmbed } = require('discord.js');

// inside a command, event listener, etc.


module.exports.mainBot = class mainBot {

    constructor(bot, getConfig, getSettings, updateSettings) {
        this.bot = bot;
        this.getConfig = getConfig;
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
    }


    async setServerPrefix(parsedCommand) {
        if (parsedCommand.message.channel.type == "DM") {
            await parsedCommand.message.reply('This can only be used in a server');
            return;
        }

        let settings = this.getSettings();
        settings['servers'][parsedCommand.message.guild.id.toString()] = {
            "custom_prefix": parsedCommand.getContent()
        }

        this.updateSettings(settings);

        await parsedCommand.message.reply("prefix changed to " + parsedCommand.getContent());
    }

    async help(parsedCommand) {

        const fields = new Array();

        const config = this.getConfig();

        

        const helpEmbed = new MessageEmbed();
        helpEmbed.setColor('#0099ff');
        helpEmbed.setTitle('Help For Commands\n');
        helpEmbed.setURL('https://oyintare.dev/');
        
        Object.keys(config['Commands']).forEach(function (key, index) {
            helpEmbed.addField(key, config['Commands'][key]['description'] + '\n' + 'Syntax: \`' + config['Commands'][key]['syntax'] + '\` \n', false);
        });
        helpEmbed.setTimestamp()

        await parsedCommand.message.reply({ embeds: [helpEmbed] });

    }

}