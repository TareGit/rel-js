const utils = bus.sync.require(`./utils`) as typeof import("./utils");

export async function getServerInfo(request, response) {
  const data = await bus.cluster?.broadcastEval(function (cluster) {
    return cluster.client.guilds.cache.size;
  });

  const guildsCount = data?.reduce(function (previous, current) {
    return previous + current;
  });

  response.send({ id: "umeko", guilds: guildsCount });
}

export async function getServerPing(request, response) {
  response.send({ recieved_at: Date.now() });
}

export async function updateGuild(request, response) {
  const guildId = request.body.id;
  console.log(guildId)
  bus.manager?.broadcastEval(`
    if(bus.guildSettings.get('${guildId}') && !bus.guildsPendingUpdate.includes('${guildId}'))
    {
        bus.guildsPendingUpdate.push('${guildId}');
    }
    `);

  utils.log(`Queued Update For Guild ${guildId}`);

  response.send({ result: "recieved" });
}

export async function updateUser(request, response) {
  const userId = request.body.id;

  bus.manager?.broadcastEval(`
        if(bus.perUserData.get('${userId}') && !bus.usersPendingUpdate.includes('${userId}'))
        {
            bus.usersPendingUpdate.push('${userId}');
        }
        `);

  utils.log(`Queued Update For User ${userId}`);

  response.send({ result: "recieved" });
}
