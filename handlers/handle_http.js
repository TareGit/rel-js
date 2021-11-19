
const express = require('express');
const https = require('https');
const fs = require('fs');
const { loadCommands } = require('./handle_commands');


let bot = undefined;
const app = express()


const port = 80
const httpsPort = 443

app.use(express.json());

app.get('/', (request, response) => {
  response.send('What are you lookin for ?');
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

app.post('/dev', (request, response) => {
  response.set('Content-Type', 'application/json')

  if (!bot.isReady()) return response.send({ "result": "client is not ready" });

  try {
    const command = request.body['command'];
    switch (command) {
      case 'reload commands':

        loadCommands(bot);

        response.send({ "result": `Reloaded ${bot.commands.size} Commands` });

        break;

      default:
        response.send({ "result": "Command does not exist!" });
        break;
    }
  } catch (error) {
    response.send({ "result": "error", "error": `${error}` });
  }

})






module.exports.setup = function (botIn) {

  bot = botIn;

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
}

