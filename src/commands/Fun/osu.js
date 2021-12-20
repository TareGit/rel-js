const { MessageEmbed } = require('discord.js');

const { sync, perGuildData, bot } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);
const axios = require("axios");
const { version, defaultPrimaryColor } = sync.require(`${process.cwd()}/config.json`);



module.exports = {
    name: 'osu',
    category: 'Fun',
    description: 'gets basic information about an Osu! player',
    ContextMenu: {},
    options: [],
    async execute(ctx) {


        const searchTerm = ctx.pureContent;

        let response = undefined;

        const Embed = new MessageEmbed();
        
        Embed.setColor((ctx.member !== null) ? perGuildData.get(ctx.member.guild.id).pColor : defaultPrimaryColor);

        try {

            const request = {
                headers: {
                    'Authorization': `Bearer ${process.env.OSU_API_TOKEN}`
                }
            };
            response = (await axios.get(`${process.env.OSU_API}/users/${searchTerm.replace(/\s+/g, '')}`, request)).data;

            console.log(response);

            const user = response;

            if (user === undefined) {

                Embed.setFooter("User Not Found");
                reply(ctx, { embeds: [Embed] });

                return;
            }

            Embed.setURL(`https://osu.ppy.sh/users/${user.id}`);

            Embed.setTitle(`${user.username} | ${user.is_online ? "Online" : "Offline"}`);

            Embed.setThumbnail(user.avatar_url);

            Embed.addField("Rank", `#${user.statistics.global_rank}`);

            Embed.addField("Accuracy", `${user.statistics.hit_accuracy}%`);

            Embed.addField("Country", user.country.name);

            Embed.setFooter(`Mode | ${user.playmode}`);

            reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter("User Not Found");

            reply(ctx, { embeds: [Embed] });
            
            console.log(error);
        }

    }
}