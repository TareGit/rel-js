import { CommandInteraction, GuildMember } from "discord.js";

const { MessageEmbed } = require('discord.js');

const { sync, guildSettings }: IDataBus = require(`${process.cwd()}/dataBus.js`);

const axios = require("axios");

const { version, defaultPrimaryColor } = sync.require(path.join(process.cwd(), '../config.json'));

const utils = sync.require(`${process.cwd()}/utils`);



const result: IUmekoSlashCommand = {
    name: 'actor',
    category: 'Fun',
    type: ECommandType.SLASH,
    description: 'Gets basic information about an actor',
    syntax: '{prefix}{name} <actor name>',
    options: [
        {
            name: "actor",
            description: "The actor to search for",
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {

        (ctx.command as CommandInteraction).options
        const searchTerm = ctx.type == EUmekoCommandContextType.SLASH_COMMAND ? (ctx.command as CommandInteraction).options.getString('actor') : (ctx.command as IParsedMessage).pureContent;

        const params = new URLSearchParams();
        params.append("query", searchTerm);

        let response = undefined;

        const Embed = new MessageEmbed();
        Embed.setColor(ctx.command.member ? guildSettings.get((ctx.command.member as GuildMember).guild.id).color : defaultPrimaryColor);

        try {

            const request = {
                headers: {
                    'Authorization': `Bearer ${process.env.TMDB_API_KEY}`
                },
                params: params
            };
            response = (await axios.get(`${process.env.TMDB_API}/search/person`, request)).data;


            const actorData = response.results[0];

            Embed.setURL(process.env.WEBSITE);

            Embed.setTitle(actorData.name);

            Embed.setImage(`https://image.tmdb.org/t/p/original${actorData.profile_path}`);

            Embed.addField("Gender", `${actorData.gender === 1 ? "Female" : "Male"}`);

            utils.reply(ctx, { embeds: [Embed] });

        } catch (error) {
            Embed.setFooter({ text: "Actor Not Found" });

            utils.reply(ctx, { embeds: [Embed] });
            utils.log(`Error Searching for Actors\x1b[0m\n`, error);
        }

    }
}

export default result;