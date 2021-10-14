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
        helpEmbed.setURL('https://oyintare.dev/');

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

        const fields = new Array();

        const config = this.getConfig();

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Status');
        Embed.setURL('https://oyintare.dev/');

        let memory = await osu.mem.free();

        let cpu = await osu.cpu.usage();

        Embed.addField(`Version`, `1.0`, false);
        Embed.addField(`Language`, `Node JS`, false);
        Embed.addField(`UP Time`, `${parseInt(osu.os.uptime() / 1000)} seconds`, false);
        Embed.addField(`CPU Usage`, `${parseInt(cpu)}%`, false);
        Embed.addField(`RAM Usage`, `${parseInt((memory.freeMemMb / memory.totalMemMb) * 100)}%`, false);

        await command.reply({ embeds: [Embed] });

    }

}