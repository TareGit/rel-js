import path from "path";
import fs from "fs";
import { Manager } from "lavacord";
import { watch } from "chokidar";
import { IBotEvent } from "./types";
import { BaseCommandInteraction, ClientEvents, Interaction, Message, Presence, TextChannel } from "discord.js";
const utils = bus.sync.require(
  path.join(process.cwd(), "utils")
) as typeof import("./utils");

const guildDataModule = bus.sync.require(
  "./modules/guildData"
) as typeof import("./modules/guildData");
const { updateServerLeveling } = bus.sync.require(
  "./modules/leveling"
) as typeof import("./modules/leveling");

const commandsModule = bus.sync.require(
  "./modules/commands"
) as typeof import("./modules/commands");

async function onMessageCreate(message: Message) {
  const bot = bus.bot;
  if (!bot || !bot.user || message.author.bot) return;


  try {

    if (message.guild) {
      updateServerLeveling(message);
    }

    if (
      message.mentions.users.has(bot.user.id) &&
      message.content &&
      message.content.split(">")[1]
    ) {
      const argument = message.content.split(">")[1].trim().toLowerCase();
      if (argument === "" || argument === "help") {
      }
    }
    const command = await commandsModule
      .parseMessage(message)
      .catch((error) => utils.log(`Error parsing message\x1b[0m\n`, error));

    if (command) {
      command.command.execute(command.ctx).catch((error) => {
        utils.log(`Error Executing Message Command\x1b[0m\n`, error);
      });
    }
  } catch (error) {
    utils.log(error);
  }
}

async function onInteractionCreate(interaction: Interaction) {
  try {
    if (!interaction.isCommand() && !interaction.isContextMenu()) {
      return;
    }
    const cmd = await commandsModule
      .parseInteractionCommand(interaction)
      .catch((error) => utils.log(`Error parsing interaction\x1b[0m\n`, error));

    if (!cmd) {
      interaction.reply("Command not yet implemented");
    } else {
      cmd.command.execute(cmd.ctx).catch((error) => {
        utils.log(`Error Executing Interaction Command\x1b[0m\n`, error);
      });
    }
  } catch (error) {
    utils.log(error);
  }
}

async function onGuildMemberUpdate(oldMember, newMember) { }

async function onGuildCreate(guild) {
  // guildDataModule.onJoinedNewGuild(guild);
}

// presence update for twitch activity
async function onPresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
  if (!newPresence.guild || !newPresence.member) return;

  const guildSettings = bus.guildSettings;

  try {
    if (!guildSettings.get(newPresence.guild.id)) return;

    const options =
      bus.guildSettings.get(newPresence.guild.id)?.twitch_options ||
      new URLSearchParams();

    if (!options.get("location") || options.get("location") === "disabled")
      return;

    const relevantNewActivities =
      newPresence && newPresence.activities
        ? newPresence.activities.filter(
          (activity) => activity.name === "Twitch"
        )
        : [];

    const relevantOldActivities =
      oldPresence && oldPresence.activities
        ? oldPresence.activities.filter(
          (activity) => activity.name === "Twitch"
        )
        : [];

    const bJustWentLive =
      relevantNewActivities.length && !relevantOldActivities.length;

    const bJustWentOffline =
      !relevantNewActivities.length && relevantOldActivities.length;

    if (!bJustWentLive && !bJustWentOffline) return;

    if (bJustWentLive) {
      const targetActivity = relevantNewActivities[0];

      const guildId = newPresence.guild.id;
      const userId = newPresence.member.id;
      const username = newPresence.member.displayName;
      const url = targetActivity.url;

      // Twitch online message here
      const twitchOnlineMsg = (options.get("msg") || "")
        .replace(/{user}/gi, `<@${userId}>`)
        .replace(/{username}/gi, `${username}`)
        .replace(/{link}/gi, `${url}`);

      if (options.get("location") === "channel" && options.get("channel")) {
        const channel = await newPresence.guild.channels
          .fetch(options.get("channel")!)
          .catch(utils.log) as TextChannel | null;

        if (channel) {
          channel.send(twitchOnlineMsg);
        }
      }

      if (options.get("give")) {
        const roles = options
          .get("give")!
          .split(",")
          .filter(
            (role) =>
              !Array.from(newPresence.member!.roles.cache.keys()).includes(role)
          );

        const user = newPresence.member;

        if (roles?.length) {
          await user.roles.add(roles, "Started Streaming").catch(utils.log);
        }
      }
    } else {
      if (options.get("give")) {
        const roles = options
          .get("give")!
          .split(",")
          .filter((role) =>
            Array.from(newPresence.member!.roles.cache.keys()).includes(role)
          );

        const user = newPresence.member;

        if (roles?.length) {
          await user.roles.remove(roles, "Stopped Streaming").catch(utils.log);
        }
      }
    }
  } catch (error) {
    utils.log(error);
  }
}

async function onBotReady() {
  utils.log("Bot Ready");

  const bot = bus.bot;

  if (!bot) return;
  /*setInterval(
    () =>
      bot.user.setActivity(`${bot.guilds.cache.size} Servers`, {
        type: "WATCHING",
      }),
    20000
  );*/

  // Volcano nodes

  const owner = await bot.users.fetch("604699803468824676");

  if (owner)
    await owner.send(
      `I just woke up for some reason | ${new Date().toLocaleString()}`
    );
  const nodes = [
    {
      id: "1",
      host: "localhost",
      port: 2333,
      password: process.env.LAVALINK_PASSWORD,
    },
  ];

  // Initilize the Manager with all the data it needs
  const LavaManager = new Manager(nodes, {
    user: bot.user?.id || "",
    shards: bot.options.shardCount,
    send: (packet) => {
      const guild = bot.guilds.cache.get(packet.d.guild_id);
      return guild?.shard.send(packet);
    },
  });

  bus.lavacordManager = LavaManager;

  try {
    await LavaManager.connect();

    utils.log("Connected to Music provider\x1b[0m");
  } catch (error) {
    utils.log("Error connecting to music provider\x1b[0m\n", error);
  }

  bot.ws
    .on(
      "VOICE_SERVER_UPDATE",
      bus.lavacordManager.voiceServerUpdate.bind(bus.lavacordManager)
    )
    .on(
      "VOICE_STATE_UPDATE",
      bus.lavacordManager.voiceStateUpdate.bind(bus.lavacordManager)
    )
    .on("GUILD_CREATE", async (data) => {
      if (data.voice_states.length) {
        for (const state of data.voice_states)
          await bus.lavacordManager?.voiceStateUpdate({
            ...state,
            guild_id: data.id,
          });
      }
    });

  LavaManager.on("error", (error, node) => {
    utils.log("Lavalink error\x1b[0m\n", error);
  });

  try {
    await guildDataModule.load();
  } catch (error) {
    utils.log("Error loading modules\x1b[0m\n", error);
  }

  await utils.getOsuApiToken();

  await utils.getSpotifyApiToken();

  // Commands loading and reloading
  watch("./commands", { persistent: true, usePolling: true }).on(
    "all",
    (event, path) => {
      utils.handleCommandDirectoryChanges(event, path);
    }
  );
}

async function onJoinedNewGuild() { }

const eventsToBind: IBotEvent[] = [
  { event: "messageCreate", funct: onMessageCreate },
  { event: "interactionCreate", funct: onInteractionCreate },
  { event: "guildMemberUpdate", funct: onGuildMemberUpdate },
  { event: "guildCreate", funct: onGuildCreate },
  { event: "presenceUpdate", funct: onPresenceUpdate },
  { event: "ready", funct: onBotReady },
  { event: "guildCreate", funct: onJoinedNewGuild },
];

if (bus.bot) {
  const bot = bus.bot;

  bus.boundBotEvents.forEach((funct, event) => {
    bot.off(event, funct);
    bus.boundBotEvents.delete(event);
  });

  eventsToBind.forEach((bindableEvent) => {
    const { event, funct } = bindableEvent;

    bot.on(event, funct);

    bus.boundBotEvents.set(event, funct);
  });
}
