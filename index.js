var process = require('process');
process.chdir(__dirname);
console.log(__dirname);
require('dotenv').config();
const fs = require('fs');
const express = require('express');
const https = require('https');
const { Client, Intents } = require('discord.js');

const eventsModule = require('./handle_events');

// bot Intents
const botIntents = {
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES
  ],

  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
}


// Setup settinngs and configs

const bot = new Client(botIntents);

bot.on('ready', () => {
  console.log('BOT ACTIVE');

  bot.users.fetch(process.env.CREATOR_ID).then((user) => {
    if (user) {
      user.send('BITCH IM AWAKE');
    }
  }).catch(console.error);

  bot.guilds.fetch().then((guilds) => {
    for (const guild of guilds) {
      guild[1].fetch().then((fetchedGuild) => {
        let user = fetchedGuild.me;
        if (user.displayName.toLowerCase() != 'rel') {
          user.setNickname('REL');
        }
      });

    }
  });
});


bot.on('messageCreate', (message) => {
  if (message.author.id === bot.user.id) return;

  eventsModule.messageCreate(message);

});

bot.on('interactionCreate', (interaction) => {
  eventsModule.interactionCreate(interaction);
});



bot.on('guildMemberUpdate', (oldMember, newMember) => {
  eventsModule.guildMemberUpdate(bot, oldMember, newMember);
});


bot.login(process.env.DISCORD_BOT_TOKEN);
eventsModule.setup(bot);

const app = express()



const port = 80
const httpsPort = 443

app.use(express.json());

app.get('/', (request, response) => {
  response.send('Hello World!');
})

app.post('/sendmessage', (request, response) => {
  response.set('Content-Type', 'application/json')

  if (!bot.isReady()) return response.send({ "result": "client is not ready" });

  try {
    bot.users.fetch(request.body['user']).then((user) => {

      if (user) {
        user.send(request.body['message']);
        response.send({ "result": "success" });
      }
      else {
        response.send({ "result": "failed to fetch user" });
      }


    });

  } catch (error) {
    response.send({ "result": "unknown error" });
  }

})

app.post('/fulfillment', (request, response) => {
  response.set('Content-Type', 'application/json')

  if (!bot.isReady()) return response.send({ "result": "client is not ready" });

  try {
    bot.users.fetch(request.body['user']).then((user) => {

      if (user) {
        user.send(request.body['message']);
        response.send({ "result": "success" });
      }
      else {
        response.send({ "result": "failed to fetch user" });
      }


    });

  } catch (error) {
    response.send({ "result": "unknown error" });
  }

})



app.listen(port, () => {
  console.log(`REL HTTP Server listening at http://rel.oyintare.dev:${port}/`)
})


if (process.platform == 'linux') {
  // serve the API with signed certificate on 443 (SSL/HTTPS) port
  const appHttps = https.createServer({
    key: fs.readFileSync('/etc/letsencrypt/live/rel.oyintare.dev/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/rel.oyintare.dev/fullchain.pem'),
  }, app);

  appHttps.listen(httpsPort, () => {
    console.log(`REL HTTPS Server listening at https://rel.oyintare.dev:${httpsPort}/`)
  });
}

