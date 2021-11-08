const { MessageEmbed } = require('discord.js');
var osu = require('node-os-utils')
// inside a command, event listener, etc.


module.exports.mainBot = class mainBot {

    constructor(getConfig, getSettings, updateSettings) {
        this.getConfig = getConfig;
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
    }


    async help(command) {

        const fields = new Array();
        const ctx = command.ctx;
        const config = this.getConfig();

        const settings = this.getSettings();
        let prefix = '?';

        if (ctx.channel.type != "DM") {

            const hasLoggedServer = settings['servers'][ctx.guild.id.toString()];
            if (!hasLoggedServer) {
                settings['servers'][ctx.guild.id.toString()] = {
                    "custom_prefix": "?"
                }

                this.updateSettings(settings);
            }
            prefix = settings['servers'][ctx.guild.id.toString()]['custom_prefix'];
        }


        const helpEmbed = new MessageEmbed();
        helpEmbed.setColor('#0099ff');
        helpEmbed.setTitle('Help For Commands\n');
        helpEmbed.setURL('https://www.oyintare.dev/');

        Object.keys(config['Commands']).forEach(function (key, index) {

            let syntax = "";
            syntax += `${prefix}${key} `;

            Object.keys(config['Commands'][key].arguments).forEach(function (item, index) {
                syntax += ` <${item}> `;
            });

            syntax = `\`${syntax}\``;

            helpEmbed.addField(key, `${config['Commands'][key]['description']} + \n Syntax: ${syntax} \n`, false);
        });
        helpEmbed.setTimestamp()

        await command.reply({ embeds: [helpEmbed] });

    }

    async getBotStatus(command) {

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Status');
        Embed.setURL('https://www.oyintare.dev/');

        let memory = await osu.mem.free();

        let cpu = await osu.cpu.usage();

        function pad(s){
            return (s < 10 ? '0' : '') + s;
          }

        const seconds = process.uptime();

        const secondsUp = parseInt(Math.floor(seconds % 60));

        const minutsUp = parseInt(Math.floor(seconds % (60*60) / 60));

        const hoursUp = parseInt(Math.floor(seconds / (60*60)));

        Embed.addField(`Version`, `1.5`, false);
        Embed.addField(`Language`, `Node JS`, false);
        Embed.addField(`UP Time`, ` ${pad(hoursUp)}Hrs ${pad(minutsUp)}Min ${pad(secondsUp)}Secs`, false);
        Embed.addField(`CPU Usage`, `${parseInt(cpu)}%`, false);
        Embed.addField(`RAM Usage`, `${parseInt((memory.freeMemMb / memory.totalMemMb) * 100)}%`, false);

        try {
            command.reply({ embeds: [Embed] });
        } catch (error) {
            console.log(error);
        }
        

    }

    async delete(command) {

        const ctx = command.ctx;
        const ammount = command.type == "COMMAND" ? ctx.options.getInteger('ammount') : parseInt(command.getArgs()[0]);

        if (!ctx.guild) return ctx.reply("you need to be in a server to use this command");

        if (ammount == 0 || ammount == NaN || ammount > 100 || ammount < 1) return ctx.reply("Ammount must be a value between 1 and 100");

        let deletedMsgs = null;

        try {
            deletedMsgs = await ctx.channel.bulkDelete(ammount);
        } catch (error) {
            console.log(error);
        }
        
        return;

    }

}