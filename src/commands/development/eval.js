const { MessageEmbed } = require('discord.js');
const ps = require(`${process.cwd()}/passthrough.js`);
const { sync, bot } = require(`${process.cwd()}/passthrough.js`);
const utils = sync.require(`${process.cwd()}/utils`);


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

        if(ctx.author.id !== process.env.CREATOR_ID) returnutils.reply(ctx,this.description);


       try {
           const evalFunction = new Function("bot","ctx","ps",ctx.pureContent);
           const response = "```" + JSON.stringify(evalFunction(bot,ctx,ps)) + "```";
           if(response === undefined) returnutils.reply(ctx,"\`The result of the evaluation was undefined\`");
           if(response.length === 0) returnutils.reply(ctx,"\`The evaluation did not return a result\`");
           
          utils.reply(ctx,response);
       } catch (error) {
           utils.reply(ctx,"\`Error Executing Evaluation\`");
            utils.log(`\x1b[31mError Executing Evaluation "${ctx.pureContent}"`,error);
       }
    }
}