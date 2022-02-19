const { MessageEmbed } = require('discord.js');
const dataBus = require(`${process.cwd()}/dataBus.js`);
const { sync, bot } = require(`${process.cwd()}/dataBus.js`);
const utils = sync.require(`${process.cwd()}/utils`);
const axios = require('axios');


module.exports = {
    name: 'eval',
    category: 'Development',
    description: 'You may look, but you may not touch!',
    ContextMenu: {},
    syntax : '{prefix}{name} <expression>',
    options: [
        {
            name: 'expression',
            description: "The Expression to Eval",
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {            

        if(ctx.author.id !== process.env.CREATOR_ID) return utils.reply(ctx,this.description);

        const searchTerm = ctx.cType == "COMMAND" ? ctx.options.getString('expression') : ctx.pureContent;

       try {
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

           const evalFunction = new AsyncFunction("bot","ctx","dataBus","utils","axios",ctx.pureContent);
           const result = await evalFunction(bot,ctx,dataBus,utils,axios);
           const response = "```" + JSON.stringify(result) + "```";
           if(!response) return utils.reply(ctx,"\`The result of the evaluation was undefined\`");
           if(!response.length) return utils.reply(ctx,"\`The evaluation did not return a result\`");
           
          utils.reply(ctx,response);
       } catch (error) {
            utils.reply(ctx,"```ERROR :: " + error.message + "```").catch(utils.log);
            utils.log(`Error Executing Evaluation "${ctx.pureContent}"`,error);
       }
    }
}