import { CommandInteraction, GuildMember } from "discord.js";
import path from "path";
import { ECommandOptionType, ECommandType, EUmekoCommandContextType, IGuildLevelingData, IParsedMessage, IUmekoSlashCommand } from "../types";
import { getPage, closePage } from '../modules/browser';
import axios from 'axios';

const utils = bus.sync.require(path.join(process.cwd(), 'utils')) as typeof import('../utils');

const command: IUmekoSlashCommand = {
    name: 'level',
    category: 'Fun',
    description: 'Displays your level',
    type: ECommandType.SLASH,
    syntax: '{prefix}{name} <specific user mention>',
    options: [
        {
            name: 'user',
            description: 'The user to check the level of',
            type: ECommandOptionType.USER,
            required: false
        }
    ],
    async execute(ctx) {
        if (!ctx.command.guild) return utils.reply(ctx, `You need to be in a server to use this command`);

        const options = bus.guildSettings.get(ctx.command.guild.id)?.leveling_options || new URLSearchParams();

        // check if leveling is enabled
        if (!options.get('location') || options.get('location') === 'disabled') return await utils.reply(ctx, `Leveling is disabled in this server`);

        // defer the reply to give puppeter time to render and incase we make an API call
        if (ctx.type === EUmekoCommandContextType.SLASH_COMMAND) await (ctx.command as CommandInteraction).deferReply();

        // select the member specified 
        const specificUser = ctx.type === EUmekoCommandContextType.SLASH_COMMAND ? ((ctx.command as CommandInteraction).options.getMember('user') as GuildMember || ctx.command.member as GuildMember) : ((ctx.command as IParsedMessage).mentions.members?.first() || ctx.command.member as GuildMember);

        // no point in bots participating in leveling
        if (specificUser?.user?.bot) return await utils.reply(ctx, 'Bots are too sweaty to participate in leveling');

        // get the guilds leveling data
        const levelingData: IGuildLevelingData = bus.guildLeveling.get(ctx.command.guild.id) || { data: {}, rank: [] };

        if (levelingData.rank) {

            levelingData.rank.sort(function (userA, userB) {
                const aData = levelingData.data[userA];
                const bData = levelingData.data[userB];

                if (aData.level === bData.level) return aData.progress - bData.progress;

                return aData.level - bData.level;
            });

            levelingData.rank.reverse();

        }

        // get the specified users leveling data 
        const levelData = levelingData.data[specificUser?.id] || {};

        // get the users level or 0 if the user has no data
        const level = levelData.level || 0;

        // get the users current XP
        const currentXp = parseFloat(((levelData.progress || 1) / 1000).toFixed(2));

        /*// fetch data from database since we don't currently have it
        if (!bus.userSettings.get(specificUser.id)) {

            const user_settings_response = await bus.db.get(`/users?q=${specificUser.id}`);

            const user_settings_data = user_settings_response.data;

            if (user_settings_data.error) {
                // need to handle this error better
                utils.log(`Error Fetchig User Data : "${user_settings_data.error}" \x1b[0m`);
            }
            else {

                // get the rows from the database
                const rows = user_settings_data;

                // make sure we actually have information to work with
                if (rows.length) {

                    // add the user's data to our memory
                    perUserData.set(specificUser.id, rows[0]);

                    // convert the afk_options from string to URLSearchParams that we can query as required
                    perUserData.get(specificUser.id).afk_options = new URLSearchParams(perUserData.get(specificUser.id).afk_options);

                    // tell the server to inform us of future updates concerning this user
                    axios.post(`${process.env.SERVER_API}/notifications-user`, { op: 'add', data: [specificUser.id], target: `${process.env.CLUSTER_API}` }).catch((error) => utils.log('Error making request to server', error.message));
                }

            }
        }*/

        // select the specific users background or use the default if it is not available
        const userBackground = bus.userSettings.get(specificUser.id)?.card_bg_url || `https://cdnb.artstation.com/p/marketplace/presentation_assets/000/106/277/large/file.jpg`;

        // the specific users avatar url
        const avatarUrl = specificUser.displayAvatarURL({ format: 'png', size: 1024 });

        const displayName = specificUser.displayName;

        const rank = levelingData.rank && levelingData.rank.includes(specificUser.id) ? levelingData.rank.indexOf(specificUser.id) + 1 : undefined;

        const rankText = typeof rank === 'number' ? `RANK ${rank}` : 'UNRANKED';

        const requiredXp = parseFloat((utils.getXpForNextLevel(level) / 1000).toFixed(2));

        const userColor = bus.userSettings.get(specificUser.id)?.color || '#87ceeb';

        const userOpacity = bus.userSettings.get(specificUser.id)?.card_opacity || 0.8;

        const cardAsHtml = utils.generateCardHtml(userColor, userOpacity, userBackground, avatarUrl, rankText, level, displayName, currentXp, requiredXp);

        // start a puppeteer browser
        /*if(!browser)
        {
            const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'], userDataDir: `${process.cwd()}/../puppeter` });
            
            Object.assign(dataBus,{
                browser : require(`${process.cwd()}/dataBus.js`);
            })
        }*/


        // create a new window and capture the ranked card
        const page = await getPage();
        page.setViewport({ width: 1200, height: 400 });
        await page.setContent(cardAsHtml);
        const content = await page.$("body");
        if (content) {
            const imageBuffer = await content.screenshot({ omitBackground: true });
            utils.reply(ctx, { files: [{ attachment: imageBuffer }] });
        }

        closePage(page);

    }
}

export default command;