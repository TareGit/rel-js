const { MessageEmbed } = require('discord.js');
const ps = require(`${process.cwd()}/passthrough.js`);
const { sync, bot } = require(`${process.cwd()}/passthrough.js`);
const { reply } = sync.require(`${process.cwd()}/utils.js`);

module.exports = {
    name: 'eval',
    category: 'Development',
    description: 'Runs an Eval Command From the Creator',
    ContextMenu: {},
    options: [
        {
            name: 'Expression',
            description: "The Expression to Eval",
            type: 3,
            required: true
        }
    ],
    async execute(ctx) {            

        if(ctx.author.id !== process.env.CREATOR_ID) return reply(ctx,"Lol, you are playing a dangerous game!");


       try {
           const evalFunction = new Function("bot","ctx","ps",ctx.pureContent);
           const response = "\`" + JSON.stringify(evalFunction(bot,ctx,ps)) + "\`";
           if(response === undefined) return reply(ctx,"\`The result of the evaluation was undefined\`");
           if(response.length === 0) return reply(ctx,"\`The evaluation did not return a result\`");
           
           reply(ctx,response);
       } catch (error) {
            reply(ctx,"\`Error Executing Evaluation\`");
            console.log(`Error Executing Evaluation \n ${ctx.pureContent} \n`);
            console.log(error)
       }
    }
}