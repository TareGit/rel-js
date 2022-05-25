import { AudioPlayer } from "@discordjs/voice";
import { Guild, GuildChannel, GuildMember, Message, TextBasedChannel, TextChannel, VoiceBasedChannel, VoiceChannel } from "discord.js";

const { sync, queues, lavacordManager, db }: IDataBus = require('../dataBus');

import { Player } from "lavacord";
import path from "path";
import Queue from "../classes/Queue";

const queuesPath = `${process.cwd().slice(0, -4)}/queues`;
const utils = sync.require(`${process.cwd()}/utils`);

const EventEmitter = require("events");

const axios = require('axios');

const fs = require('fs/promises');

/**
 * Creates a new queue.
 * @param ctx The context of the command
 * @returns A new queue.
 */
export function createQueue(ctx: IUmekoCommandContext) {

    const newQueue = new Queue(ctx, l);

    queues.set((ctx.command.member as GuildMember).guild.id, newQueue);

    return newQueue;
}






async function loadSavedSong(guild: Guild, song: ISavedSong, priority: number): Promise<[ISong, number]> {

    const member = await guild.members.fetch(song.member);

    const songs: ISong[] = (await getSongs(song.uri, member));


    return [songs[0], priority];
}

async function loadQueueFromFile(filename: string) {

    const fullPath = path.join(queuesPath, filename);

    const file = await fs.readFile(fullPath, 'utf-8').catch((error) => { utils.log(error) });

    let QueueDataAsJson: ISavedQueue | undefined;

    try {
        QueueDataAsJson = JSON.parse(file);
    } catch (error) {
        utils.log("Error parsing saved queue into json", error);
        await fs.unlink(fullPath);
        return;
    }

    if (!QueueDataAsJson) {
        utils.log("Error parsing saved queue into json");
        await fs.unlink(fullPath);
    }


    if (!QueueDataAsJson.id || !QueueDataAsJson.voice || !QueueDataAsJson.channel || !QueueDataAsJson.songs || !QueueDataAsJson.songs.length) {
        utils.log('Deleting invalid saved queue', filename);
        await fs.unlink(fullPath);
        return;
    }

    const Id = QueueDataAsJson.id;

    if (!await bot.guilds.fetch(Id)) {
        await fs.unlink(fullPath);
        return;
    };

    try {
        const guild = await bot.guilds.fetch(Id);

        const voice: VoiceBasedChannel = await guild.channels.fetch(QueueDataAsJson.voice);

        if (voice && voice.members && voice.members.size === 0) {
            await fs.unlink(fullPath);
            return;
        }

        const channel: TextBasedChannel = await guild.channels.fetch(QueueDataAsJson.channel);

        const songs = QueueDataAsJson.songs;

        const songLoaders: Promise<[ISong, number]>[] = [];

        songs.forEach(function (songData, index) {
            songLoaders.push(loadSavedSong(guild, songData, index));
        });

        const loadedSongs: ISong[] = (await Promise.all(songLoaders)).sort(function (a, b) {
            return a[1] - b[1];
        }).map(item => item[0]);

        const loadedQueue: ILoadedQueue = {
            id: Id,
            voice: voice,
            channel: channel,
            songs: loadedSongs,
            loopType: QueueDataAsJson.loopType,
            volume: QueueDataAsJson.volume,
        }

        const queue = new Queue(loadedQueue);

        queues.set(Id, queue);

        const player: Player = await LavaManager.join({
            guild: Id,
            channel: voice.id,
            node: "1"
        });

        queue.player = player;
        const playerEndBind = onSongEnd.bind(queue);
        queue.player.on('end', playerEndBind);
        queue.boundEvents.push({ owner: queue.player, event: 'end', function: playerEndBind })


        await fs.unlink(fullPath);

        playNextSong(queue);

    } catch (error) {
        utils.log(`Error loading queue ${filename} :: `, error);
        await fs.unlink(fullPath);
    }
}


if (modulesLastReloadTime.music !== undefined) {

    utils.reloadCommandCategory('Music');

    try {
        queues.forEach(function (queue, key) {

            const oldQueue = queue;

            oldQueue.loadType = 1;

            const newQueue = new module.exports.Queue(oldQueue);

            oldQueue.boundEvents.forEach(function (boundEvent) {

                if (boundEvent.owner && boundEvent.function) {
                    boundEvent.owner.removeListener(boundEvent.event, boundEvent.function);
                }
            })

            if (oldQueue.timeout != undefined) {
                clearTimeout(oldQueue.timeout);
                oldQueue.timeout = undefined;
            }

            oldQueue.player == undefined;

            queues.set(key, newQueue);

        });


    } catch (error) {
        utils.log(`Error transfering old queue data\n`, error);
    }


    utils.log('Music Module Reloaded');
}
else {
    utils.log('Music Module loaded');


    fs.readdir(queuesPath).then((files) => {

        if (!files.length) return;

        const guilds = Array.from(bot.guilds.cache.keys());

        files.forEach(file => {
            if (guilds.indexOf(file.split('.')[0]) !== -1) {
                loadQueueFromFile(file);
            }
        })
    });
}

if (bot) {
    modulesLastReloadTime.music = bot.uptime;
}

