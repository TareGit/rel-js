const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { DISCORD_BOT_TOKEN } = require("../secretes.json");

const rest = new REST({ version: "9" }).setToken(DISCORD_BOT_TOKEN);

rest
  .get(Routes.guildChannels("919021496914018346"))
  .then((response) => {
    console.log(response);
  })
  .catch(console.log);
