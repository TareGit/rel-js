const { manager, sync, modulesLastReloadTime } = require('./dataBus');
const utils = sync.require(`./utils`);

async function getServerInfo(request,response){
    const data = await manager.broadcastEval(function(bot){ return bot.guilds.cache.size;})

    const guildsCount =  data.reduce(function (previous,current){
        return previous + current;
    });

    response.send({ id : 'umeko' , guilds : guildsCount });
}

async function getServerPing(request,response){
    response.send({ recieved_at : Date.now() });
}

async function updateGuild(request,response){
    const guildId = request.body.id;

    manager.broadcastEval(`
    if(this.dataBus.perGuildSettings.get('${guildId}') && !this.dataBus.guildsPendingUpdate.includes('${guildId}'))
    {
        this.dataBus.guildsPendingUpdate.push('${guildId}');
    }
    `);

    utils.log(`Recieved Update For Guild ${guildId}`);

    response.send({ result : 'recieved'});
}

async function updateUser(request,response){
    const userId = request.body.id;


    manager.broadcastEval(`
        if(this.dataBus.perUserData.get('${userId}') && !this.dataBus.usersPendingUpdate.includes('${userId}'))
        {
            this.dataBus.usersPendingUpdate.push('${userId}');
        }
        `);

    utils.log(`Recieved Update For User ${userId}`);

    response.send({ result : 'recieved'});
}


module.exports = {
    getServerInfo : getServerInfo,
    getServerPing : getServerPing,
    updateGuild : updateGuild,
    updateUser : updateUser
}