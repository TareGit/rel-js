const { MessageEmbed } = require('discord.js');

const { sync, perGuildSettings, bot } = require(`${process.cwd()}/passthrough.js`);

const axios = require("axios");

const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);

const utils = sync.require(`${process.cwd()}/utils`);



module.exports = {
    name: 'osu',
    category: 'Fun',
    description: 'Gets basic information about an Osu! player',
    ContextMenu: {},
    syntax : '{prefix}{name} <osu id | osu username>',
    options: [
        {
            name : "player",
            description : "The username or ID of the player to search for",
            type : 3,
            required : true
          }
    ],
    async execute(ctx) {


        const searchTerm = ctx.pureContent;

        let response = undefined;

        const Embed = new MessageEmbed();
        
        Embed.setColor((ctx.member !== null) ? perGuildSettings.get(ctx.member.guild.id).color : defaultPrimaryColor);

        try {

            const request = {
                headers: {
                    'Authorization': `Bearer ${process.env.OSU_API_TOKEN}`
                }
            };
            response = (await axios.get(`${process.env.OSU_API}/users/${searchTerm.replace(/\s+/g, '')}`, request)).data;

            const user = response;

            if (user === undefined) {

                Embed.setFooter("User Not Found");
               utils.reply(ctx, { embeds: [Embed] });

                return;
            }

            Embed.setURL(`https://osu.ppy.sh/users/${user.id}`);

            Embed.setTitle(`${user.username} | ${user.is_online ? "Online" : "Offline"}`);

            Embed.setThumbnail(user.avatar_url);

            Embed.addField("Rank", `#${user.statistics.global_rank || 'Unknown'}`);

            Embed.addField("Accuracy", `${user.statistics.hit_accuracy}%`);

            Embed.addField("Country", user.country.name);

            Embed.setFooter(`Mode | ${user.playmode}`);

           utils.reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text : "User Not Found" });

           utils.reply(ctx, { embeds: [Embed] });
            
            utils.log(`\x1b[31mError fetching Osu Data\x1b[0m`,error);
        }

    }
}