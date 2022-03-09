const { sync, bot, queues, perGuildSettings, LavaManager, modulesLastReloadTime, db, commands } = require(`${process.cwd()}/dataBus.js`);

const { queueTimeout, queueItemsPerPage, maxQueueFetchTime, maxRawVolume, defaultVolumeMultiplier, leftArrowEmoji, rightArrowEmoji } = sync.require(`${process.cwd()}/config.json`);

const { MessageEmbed, MessageActionRow, MessageButton, InteractionCollector, Interaction } = require('discord.js');

const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, AudioPlayerState, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');

const utils = sync.require(`${process.cwd()}/utils`);

const EventEmitter = require("events");

const axios = require('axios');

const loopTypes = ['off','song','queue'];

const fs = require('fs/promises');

const queuesPath = `${process.cwd().slice(0,-4)}/queues`;

/**
 * Checks the url specified and returns its type.
 * @param {String} url The url to check.
 * @returns The result of the check as an object {type , id if spotify type}.
 */
function checkUrl(url) {
    try {
        const spotifyExpression = /^(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/)(?:embed)?\/?(track|album|playlist)(?::|\/)((?:[0-9a-zA-Z]){22}))/;
        const spMatch = url.match(spotifyExpression);

        if (spMatch) {
            const type = spMatch[1]
            const id = spMatch[2]

            return { type: `spotify-${type}`, id: id }
        }

        return { type: 'search' };
    } catch (error) {
        utils.log(`Error validating play url "${url}"`, error);
        return { type: 'search' };
    }


}



/**
 * Fetches a track from the spofity API.
 * @param check The check object returned from running the 'check' function 
 * @returns The data from the API.
 */
async function fetchSpotifyTrack({ id }) {
    const headers = {
        'Authorization': `Bearer ${process.env.SPOTIFY_API_TOKEN}`
    }

    const data = (await axios.get(`${process.env.SPOTIFY_API}/tracks/${id}`, { headers: headers })).data;

    return data;
}

/**
 * Fetches an albumn from the spotify API.
 * @param check The check object returned from running the 'check' function 
 * @returns The data from the API.
 */
async function fetchSpotifyAlbumTracks({ id }) {

    const headers = {
        'Authorization': `Bearer ${process.env.SPOTIFY_API_TOKEN}`
    }

    const data = (await axios.get(`${process.env.SPOTIFY_API}/albums/${id}/tracks`, { headers: headers })).data;

    return data.items;

}

/**
 * Fetches a playlist from the spofity API.
 * @param check The check object returned from running the 'check' function 
 * @returns The data from the API.
 */
async function fetchSpotifyPlaylistTracks({ id }) {

    const headers = {
        'Authorization': `Bearer ${process.env.SPOTIFY_API_TOKEN}`
    }

    const data = (await axios.get(`${process.env.SPOTIFY_API}/playlists/${id}/tracks?fields=items(track(artists,name))`, { headers: headers })).data;

    return data.items;
}


/**
 * Creates a song object.
 * @param {LavalinkTrackData} songData The track data returned from the music provider.
 * @param songRequester The user that requested the song.
 * @param {String} songGroupURL The grouping url for queue song (i.e. the spotify albumn link).
 * @returns A song object.
 */
function createSong(songData, songRequester, songGroupURL = "") {
    return {
        id: songData.info.identifier,
        track: songData.track,
        title: songData.info.title,
        uri: songData.info.uri,
        length: songData.info.length,
        requester: songRequester,
        groupURL: songGroupURL
    }
}
/**
 * Creates a song from a search term and user object
 * @param {String} search The term to search for
 * @param user The user that requested the song.
 * @returns A song object || undefined if the search term returned no results.
 */
async function getSongFromSavedData(guild,savedSong,arrayToAddTo) {
    try {
        const node = LavaManager.idealNodes[0];

        const params = new URLSearchParams();

        const user = bot.guilds.cache.get(guild).members.fetch(savedSong.member);
        
        const songLink = savedSong.link;
        params.append("identifier", "ytsearch:" + search);

        const data = (await axios.get(`http://${node.host}:${node.port}/loadtracks?${params}`, { headers: { Authorization: node.password } })).data;

        const songData = data.tracks[0];

        if (songData === undefined) return undefined;

        if (songData.info === undefined) return undefined;

        return createSong(songData, user, songData.info.uri);
    } catch (error) {
        utils.log(`Error fetching song for "${search}"\n`, error);
        return undefined;
    }

}

/**
 * Creates a song from a search term and user object
 * @param {String} search The term to search for
 * @param user The user that requested the song.
 * @returns A song object || undefined if the search term returned no results.
 */
async function getSongs(search, user) {
    try {
        const node = LavaManager.idealNodes[0];

        const params = new URLSearchParams();

        params.append("identifier", "ytsearch:" + search);

        const data = (await axios.get(`http://${node.host}:${node.port}/loadtracks?${params}`, { headers: { Authorization: node.password } })).data;

        if (!data.tracks) return [];

        return data.tracks.map(songData => createSong(songData, user, songData.info.uri));
    } catch (error) {
        utils.log(`Error fetching song for "${search}"\n`, error);
        return undefined;
    }

}

/**
 * Times out after the specified number of seconds
 * @param ms The number of seconds before the function times out (i.e. returns a rejected promise);
 * @returns A rejected promise.
 */
function trackFetchTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Converts a spotify track from the API into a song and pushes it into the specified Array.
 * @param ctx The command that initiated queue action.
 * @param {SpotifyApiTrack} trackData The spofity track data from the API.
 * @param {Array} songArray The Array to push the converted song into.
 */
async function convertSpotifyToSong(ctx, trackData, songArray) {

    let artists = "";

    trackData.artists.forEach(element => artists += ' ' + element.name);

    const searchToMake = trackData.name + ' ' + artists + ' audio';

    const songs = await Promise.race([getSongs(searchToMake, ctx.member), trackFetchTimeout(maxQueueFetchTime)]);

    if (song === undefined) return;

    if (songArray === undefined) return;

    songs[0].priority = trackData.priority;

    songArray.push(songs[0]);
}

/**
 * Generates a now playing message
 * @param {Queue} queue The queue to generate the message for
 * @param targetChannel Optional parameter to specify a channel for the message
 */
async function createNowPlayingMessage(queue, ctx = undefined) {

    const channel = queue.channel;

    let song = queue.currentSong;

    if (queue.isCreatingNowPlaying) return undefined;

    queue.isCreatingNowPlaying = true;


    if (song == undefined) {
        // wait for half a second
        await new Promise(r => setTimeout(r, 500));

        song = queue.currentSong;

        if (song == undefined) {
            queue.isCreatingNowPlaying = false;
            return;
        }
    }

    // remove previous NowPlaying
    if (queue.nowPlayingMessage != undefined) {
        queue.nowPlayingMessage.stop('EndOfLife');
        queue.nowPlayingMessage = undefined;
    }

    const Embed = new MessageEmbed();
    Embed.setColor(perGuildSettings.get(queue.Id).color);
    Embed.setTitle(`**${song.title}**`);
    Embed.setURL(`${song.uri}`);
    Embed.setDescription(`**Volume** : **${parseInt(queue.volume * 100)}%** | **loop mode** : **${loopTypes[queue.loopType]}**`);
    Embed.setFooter({ text: `${song.requester.displayName}`, iconURL: song.requester.displayAvatarURL({ format: 'png', size: 32 }) });
    const nowButtons = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('skip')
                .setLabel('Skip')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(isPaused(queue) ? 'resume' : 'pause')
                .setLabel(isPaused(queue) ? 'Resume' : 'Pause')
                .setStyle(`SUCCESS`),
            new MessageButton()
                .setCustomId('stop')
                .setLabel('Stop')
                .setStyle('DANGER'),
            new MessageButton()
                .setCustomId('queue')
                .setLabel('Queue')
                .setStyle('SECONDARY'),
        );
    
    let messsage = undefined;

    if(ctx)
    {
        message = await utils.reply(ctx,{ embeds: [Embed], components: [nowButtons], fetchReply: true });
    }
    else
    {
        message = await channel.send({ embeds: [Embed], components: [nowButtons], fetchReply: true });
    }

    
    if (message) {

        const nowPlayingCollector = new InteractionCollector(bot, { message: message, componentType: 'BUTTON' });
        nowPlayingCollector.queue = queue;


        nowPlayingCollector.on('collect', async (button) => {

            await button.deferUpdate();

            button.cType = 'COMMAND';

            Object.assign(button, { forceChannelReply: true });

            switch (button.customId) {
                case 'pause':
                    if (commands.get('pause') !== undefined) await commands.get('pause').execute(button);
                    break;

                case 'resume':
                    if (commands.get('resume') !== undefined) await commands.get('resume').execute(button);
                    break;

                case 'queue':
                    if (commands.get('queue') !== undefined) await commands.get('queue').execute(button);
                    break;

                case 'skip':
                    if (commands.get('skip') !== undefined) await commands.get('skip').execute(button);
                    break;

                case 'stop':
                    if (commands.get('stop') !== undefined) await commands.get('stop').execute(button);
                    break;
            }

            if(nowPlayingCollector.ended) return;

            button.forceChannelReply = undefined;

            const editedNowButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('skip')
                        .setLabel('Skip')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId(isPaused(nowPlayingCollector.queue) ? 'resume' : 'pause')
                        .setLabel(isPaused(nowPlayingCollector.queue) ? 'Resume' : 'Pause')
                        .setStyle(`SUCCESS`),
                    new MessageButton()
                        .setCustomId('stop')
                        .setLabel('Stop')
                        .setStyle('DANGER'),
                    new MessageButton()
                        .setCustomId('queue')
                        .setLabel('Queue')
                        .setStyle('SECONDARY'),
                );

            await button.editReply({ embeds: [Embed], components: [editedNowButtons] });
        });

        nowPlayingCollector.on('end', (collected, reason) => {

            const editedNowButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('skip')
                        .setLabel('Skip')
                        .setStyle('PRIMARY')
                        .setDisabled(true),
                    new MessageButton()
                        .setCustomId(isPaused(nowPlayingCollector.queue) ? 'resume' : 'pause')
                        .setLabel(isPaused(nowPlayingCollector.queue) ? 'Resume' : 'Pause')
                        .setStyle(`SUCCESS`)
                        .setDisabled(true),
                    new MessageButton()
                        .setCustomId('stop')
                        .setLabel('Stop')
                        .setStyle('DANGER')
                        .setDisabled(true),
                    new MessageButton()
                        .setCustomId('queue')
                        .setLabel('Queue')
                        .setStyle('SECONDARY')
                        .setDisabled(true),
                );

            nowPlayingCollector.options.message.fetch().then((message) => {
                if (message) message.edit({ embeds: [message.embeds[0]], components: [editedNowButtons] });
            }).catch(utils.log);;
        });

        queue.nowPlayingMessage = nowPlayingCollector;

    }

    queue.isCreatingNowPlaying = false;

}

/**
 * Generates a current queue message
 * @param {Queue} queue The queue to generate the message for.
 * @param {Number} page The page to generate the embed for.
 * @return [The Embed Created, The total number of pages]
 */
function generateQueueEmbed(queue, page) {

    const currentQueueLenth = queue.songs.length;
    const itemsPerPage = queueItemsPerPage;
    const prevCurrentPages = Math.ceil((currentQueueLenth / itemsPerPage))
    const currentPages = prevCurrentPages < 1 ? 1 : prevCurrentPages;

    const Embed = new MessageEmbed();
    Embed.setColor(perGuildSettings.get(queue.Id).color);
    Embed.setTitle(`${currentQueueLenth} in Queue`);
    Embed.setURL(process.env.WEBSITE);

    const max = currentQueueLenth > itemsPerPage ? itemsPerPage * page : currentQueueLenth;

    const startIndex = max > itemsPerPage ? (max - itemsPerPage) : 0;

    for (let i = startIndex; i < max; i++) {
        let currentSong = queue.songs[i];

        if (currentSong != undefined) Embed.addField(`${i}) \`${currentSong.title}\``, `**Requested by** ${currentSong.requester} \n`, false);
        
    }

    Embed.setFooter({ text: `Page ${page} of ${currentPages}` });

    return [Embed, currentPages];
}

/**
 * Pushes voice state updates from the websocket to the music provider
 * @param {WebsocketPayload} data The payload from the websocket
 */
function voiceStateUpdate(data) {
    if (data.guild_id === this.Id && data.user_id === bot.user.id) {
        if (data.channel_id === null && !this.isSwitchingChannels) {
            const boundDestroy = destroyQueue.bind(this);
            boundDestroy();
        }
    }
}

/**
 * Ensures a queue is still playing incase something goes wrong
 */
async function ensurePlay() {
    if (!isPlaying(queue) && !isPaused(queue) && queue.songs.length > 0) {
        playNextSong(queue);
    }
}

/**
 * Handles the end of a song
 * @param {MusicProviderPayload} data The payload from the music provider.
 */

function onSongEnd(data) {
    if (data.reason === "REPLACED") return; // Ignore REPLACED reason to prevent skip loops

    this.emit('state', 'Finished');

    switch (loopTypes[this.loopType]) {
        case loopTypes[1]:
            this.songs.unshift(this.currentSong);
            break;

        case loopTypes[2]:
            this.songs.push(this.currentSong);
            break;
    }

    playNextSong(this);
}

/**
 * Plays the next song in a queue
 * @param {Queue} queue The queue specified.
 */
async function playNextSong(queue) {

    if (queue.timeout != undefined) {
        clearTimeout(queue.timeout);
        queue.timeout = undefined;
    }

    if (queue.songs.length == 0) {
        queue.timeout = setTimeout(destroyQueue.bind(queue), queueTimeout);
        queue.isIdle = true;
        queue.emit('state', 'Idle');
        await deleteSavedQueueFile(queue);
        return;
    }

    try {

        const song = queue.songs[0];

        queue.currentSong = song;

        if (queue.isFirstPlay) {
            queue.player.play(song.track, { "volume": queue.volume * maxRawVolume });
            queue.isFirstPlay = false;
        }
        else {
            queue.player.play(song.track);
        }


        createNowPlayingMessage(queue);

        queue.songs.shift();

        queue.emit('state', 'Playing');

    } catch (error) {

        utils.log(`Error playing song\n`, error);

        queue.songs.shift();

        playNextSong(queue);
    }

    await saveQueueToFile(queue);

}

/**
 * Parses a command for the specified queue
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.parseInput = async function (ctx, queue) {

    let url = "";

    if (ctx.cType != "MESSAGE") await ctx.deferReply(); // defer because queue might take a while

    if (queue.player === undefined) {

        queue.player = await LavaManager.join({
            guild: ctx.member.guild.id, // Guild id
            channel: ctx.member.voice.channel.id, // Channel id
            node: "1", // lavalink node id, based on array of nodes
        });

        const playerEndBind = onSongEnd.bind(queue);
        queue.player.on('end', playerEndBind);
        queue.boundEvents.push({ owner: queue.player, event: 'end', function: playerEndBind })
    }

    // handle different command types
    switch (ctx.cType) {
        case 'MESSAGE':
            url = ctx.pureContent;
            break;
        case 'COMMAND':
            url = ctx.options.getString('url');
            break;
        case 'CONTEXT_MENU':
            const contextMessage = ctx.options.getMessage('message');
            if (contextMessage.embeds[0] !== undefined) {
                url = contextMessage.embeds[0].url;
            }
            else if (contextMessage.content !== '') {
                const contentLow = contextMessage.content.toLowerCase();
                url = contextMessage.content;
            }
            break;
    }


    if (url.length == 0) return await commands.get('help').execute(ctx,'play');


    let newSongs = [];


    const check = checkUrl(url);

    // Fetch song data
    try {
        // Simple yt video shit
        if (check.type === "search") // handle just a regular search term
        {
            const songs = await getSongs(url, ctx.member, false);

            if (songs.length) newSongs.push.apply(newSongs,songs);
        }
        else if (check.type == 'spotify-track') {
            const spotifyData = await fetchSpotifyTrack(check)

            const song = await convertSpotifyToSong(ctx, spotifyData, newSongs);
        }
        else if (check.type == 'spotify-album') {
            const tracks = await fetchSpotifyAlbumTracks(check);

            const promisesToAwait = [];

            tracks.forEach(function(data,index) {
                data.priority = index;
                promisesToAwait.push(convertSpotifyToSong(ctx, data, newSongs));
            });

            await Promise.all(promisesToAwait);

        }
        else if (check.type == 'spotify-playlist') {
            const tracks = await fetchSpotifyPlaylistTracks(check);

            const promisesToAwait = [];

            tracks.forEach(function(data,index) {
                data.track.priority = index;
                promisesToAwait.push(convertSpotifyToSong(ctx, data.track, newSongs));
            });

            await Promise.all(promisesToAwait);
        }
    }
    catch (error) {
        utils.log(`Error fetching song for url "${url}"\n`, error);
    }

    if(newSongs.length && newSongs[0].priority !== undefined)
    {
        newSongs.sort((a,b) => { return a.priority - b.priority});
    }

    queue.songs.push.apply(queue.songs, newSongs);


    if (queue.isIdle) {
        queue.isIdle = false;

        playNextSong(queue);

        if (newSongs[0] == undefined) return await utils.reply(ctx, "The music could not be loaded");


        if (ctx.cType !== "MESSAGE") await utils.reply(ctx, "Playing");

    }
    else {
        const Embed = new MessageEmbed();

        Embed.setColor(perGuildSettings.get(queue.Id).color);
        Embed.setFooter({ text: `Added to the Queue`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

        if (newSongs.length > 1) {
            Embed.setTitle(`${newSongs.length} Songs`);
            Embed.setURL(`${url}`);
        }
        else {
            if (newSongs[0] == undefined) return await utils.reply(ctx, "The music could not be loaded");

            Embed.setTitle(`${newSongs[0].title}`);
            Embed.setURL(`${newSongs[0].uri}`)

        }

        await utils.reply(ctx, { embeds: [Embed] })
    }

    saveQueueToFile(queue);
}

/**
 * Pauses a song
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.pauseSong = async function (ctx, queue) {
    if (isPlaying(queue) && !isPaused(queue)) {
        queue.emit('state', 'Paused');

        await queue.player.pause(true);

        const Embed = new MessageEmbed();
        Embed.setColor(perGuildSettings.get(queue.Id).color);
        Embed.setURL(process.env.WEBSITE);
        Embed.setFooter({ text: `${ctx.member.displayName} paused the music`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

        await utils.reply(ctx, { embeds: [Embed] })
    }
}

/**
 * Resumes a song
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.resumeSong = async function (ctx, queue) {
    if (isPaused(queue)) {
        queue.emit('state', 'Resumed');

        await queue.player.pause(false);

        const Embed = new MessageEmbed();
        Embed.setColor(perGuildSettings.get(queue.Id).color);
        Embed.setURL(process.env.WEBSITE);
        Embed.setFooter({ text: `${ctx.member.displayName} Un-Paused the music`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

        await utils.reply(ctx, { embeds: [Embed] })
    }
}

/**
 * Removes a song from the specified queue
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.removeSong = async function (ctx, queue) {
    const index = ctx.cType == "COMMAND" ? ctx.options.getInteger('index') : parseInt(ctx.args[0]);

    if (!index) return await commands.get('help').execute(ctx,'remove');

    if (index !== index) {
        await commands.get('help').execute(ctx,'remove');
        return;
    }

    if (index < 0 || index > queue.songs.length - 1) {
        await utils.reply(ctx, `Please select an index from the queue.`);
        await commands.get('queue').execute(ctx);
        return;
    }

    const song = queue.songs[index];

    queue.songs.splice(index,1)

    saveQueueToFile(queue);

    const Embed = new MessageEmbed();
    Embed.setColor(perGuildSettings.get(queue.Id).color);
    Embed.setURL(process.env.WEBSITE);
    Embed.setFooter({ text: `Removed "${song.title}" from the queue`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

    await utils.reply(ctx, { embeds: [Embed] });
}

/**
 * Displays the "NowPlaying" Message
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.showNowPlaying = async function (ctx, queue) {

    if (isPlaying(queue)) {
        await createNowPlayingMessage(queue, ctx);
    }
}

/**
 * Sets the looping state of the queue
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.setLooping = async function (ctx, queue) {

    if (ctx.cType === 'MESSAGE' && ctx.args[0] === undefined) return await utils.reply(ctx, commands.get('loop').description);

    const Embed = new MessageEmbed();

    Embed.setColor(perGuildSettings.get(queue.Id).color);

    Embed.setURL(process.env.WEBSITE);
    Embed.setFooter({ text: `${ctx.member.displayName}`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

    const option = ctx.cType === 'COMMAND' ? ctx.options.getString('state') : ctx.args[0];

    if (option.toLowerCase() === 'off') {

        queue.loopType = 0;
        Embed.setFooter({ text: `Looping Off`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });
    } else if (option.toLowerCase() === 'song') {

        queue.loopType = 1;
        Embed.setFooter({ text: `Looping Current Song`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });
    } else if (option.toLowerCase() === 'queue') {

        queue.loopType = 2;
        Embed.setFooter({ text: `Looping Queue`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });
    } else {
        await commands.get('help').execute(ctx,'loop');
        return
    }

    await utils.reply(ctx, { embeds: [Embed] })

    saveQueueToFile(queue);

}

/**
 * Displays the current song list
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.showQueue = async function (ctx, queue) {

    if (queue.songs.length > queueItemsPerPage) {
        const showQueueButtons = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId('previous')
                    .setStyle('PRIMARY')
                    .setEmoji(leftArrowEmoji)
                    .setDisabled(true),
                new MessageButton()
                    .setCustomId('next')
                    .setEmoji(rightArrowEmoji)
                    .setStyle(`PRIMARY`),
            );

        const message = await utils.reply(ctx, { embeds: [generateQueueEmbed(queue, 1)[0]], components: [showQueueButtons], fetchReply: true });
        if (message) {

            const queueCollector = new InteractionCollector(bot, { message: message, componentType: 'BUTTON', idle: 7000 });
            queueCollector.resetTimer({ time: 7000 });
            queueCollector.currentPage = 1;
            queueCollector.queue = queue;
            queueCollector.owner = (ctx.author !== null && ctx.author !== undefined) ? ctx.author.id : ctx.user.id;

            queueCollector.on('collect', async (button) => {

                if (button.user.id !== queueCollector.owner) {
                    return await utils.reply(button, { content: "why must thou choose violence ?", ephemeral: true });
                }

                await button.deferUpdate();

                const newButtons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('previous')
                            .setEmoji(leftArrowEmoji)
                            .setStyle('PRIMARY'),
                        new MessageButton()
                            .setCustomId('next')
                            .setEmoji(rightArrowEmoji)
                            .setStyle(`PRIMARY`),
                    );


                if (button.customId == 'previous') {
                    queueCollector.currentPage--;
                }

                if (button.customId == 'next') {
                    queueCollector.currentPage++;
                }

                const generatedData = generateQueueEmbed(queueCollector.queue, queueCollector.currentPage);

                const newEmbed = generatedData[0];

                if (queueCollector.currentPage == 1) newButtons.components[0].setDisabled(true);
                if (queueCollector.currentPage == generatedData[1]) newButtons.components[1].setDisabled(true);

                queueCollector.resetTimer({ time: 7000 });

                await button.editReply({ embeds: [newEmbed], components: [newButtons] });
            });

            queueCollector.on('end', (collected, reason) => {

                const newButtons = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('previous')
                            .setEmoji(leftArrowEmoji)
                            .setStyle('PRIMARY')
                            .setDisabled(true),
                        new MessageButton()
                            .setCustomId('next')
                            .setEmoji(rightArrowEmoji)
                            .setStyle(`PRIMARY`)
                            .setDisabled(true),
                    );

                queueCollector.options.message.fetch().then((message) => {
                    if (message) message.edit({ embeds: [message.embeds[0]], components: [newButtons] });
                }).catch(utils.log);;
            });

        }
        else {

            await utils.reply(ctx, { embeds: [generateQueueEmbed(queue, 1)[0]] });
        }


    }
    else {
        await utils.reply(ctx, { embeds: [generateQueueEmbed(queue, 1)[0]] });
    }

}

/**
 * Saves the song list of the queue to the Database
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.saveQueue = async function (ctx, queue) {

}

/**
 * loads the song list into the specified queue or into a new queue
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.loadQueue = async function (ctx, queue) {
}

/**
 * Sets the volume of the specified queue
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.setVolume = async function (ctx, queue) {

    const volume = ctx.cType == "COMMAND" ? ctx.options.getInteger('volume') : parseInt(ctx.args[0]);

    if (!volume) return await commands.get('help').execute(ctx,'volume');


    if (volume !== volume) {
        await commands.get('help').execute(ctx,'volume');
        return;
    }

    if (volume < 1 || volume > 100) {
        await utils.reply(ctx, 'Please use a value between 1 and 100.');
        return;
    }

    queue.volume = (volume / 100);

    queue.player.volume(queue.volume * maxRawVolume);

    const Embed = new MessageEmbed();
    Embed.setColor(perGuildSettings.get(queue.Id).color);
    Embed.setURL(process.env.WEBSITE);
    Embed.setFooter({ text: `${ctx.member.displayName} Changed the volume to ${parseInt(queue.volume * 100)}`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

    await utils.reply(ctx, { embeds: [Embed] });

    saveQueueToFile(queue);
}

/**
 * Skips the current song in the specified queue
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.skipSong = async function (ctx, queue) {

    if (queue.songs.length != 0 || (isPlaying(queue) && queue.loopType !== 0)) {

        const Embed = new MessageEmbed();
        Embed.setColor(perGuildSettings.get(queue.Id).color);
        Embed.setURL(process.env.WEBSITE);
        Embed.setFooter({ text: `${ctx.member.displayName} Skipped the song`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

        await queue.player.stop();


        await utils.reply(ctx, { embeds: [Embed] });


    }
    else {

        const Embed = new MessageEmbed();
        Embed.setColor(perGuildSettings.get(queue.Id).color);
        Embed.setURL(process.env.WEBSITE);
        Embed.setFooter({ text: `The Queue is empty`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });

        await utils.reply(ctx, { embeds: [Embed] });
    }

}

/**
 * Stops the specified queue and disconnects the bot from the voice channel
 * @param ctx The command.
 * @param {Queue} queue The queue specified.
 */
module.exports.stop = async function (ctx, queue) {

    const Embed = new MessageEmbed();
    Embed.setColor(perGuildSettings.get(queue.Id).color);
    Embed.setURL(process.env.WEBSITE);
    Embed.setFooter({ text: `${ctx.member.displayName} Disconnected Me`, iconURL: ctx.member.displayAvatarURL({ format: 'png', size: 32 }) });


    await utils.reply(ctx, { embeds: [Embed] });

    const boundDestroy = destroyQueue.bind(queue);

    boundDestroy();
}

/**
 * Checks if the queue specified is currently active (i.e. playing or paused)
 * @param {Queue} queue The queue specified.
 * @returns boolean
 */
function isPlaying(queue) {
    return queue.player.playing || queue.player.paused;
}

/**
 * Checks if the queue specified is paused
 * @param {Queue} queue The queue specified.
 * @returns boolean
 */
function isPaused(queue) {
    return queue.player.paused;
}

/**
 * Destroys the queue the function is bound to
 */
async function destroyQueue() {

    if (this.isDisconnecting) return

    this.isDisconnecting = true;

    if (this.nowPlayingMessage != undefined) {
        this.nowPlayingMessage.stop('EndOfLife');
        this.nowPlayingMessage = undefined;
    }

    if (this.timeout != undefined) {
        clearTimeout(this.timeout);
        this.timeout = undefined;
    }

    if(this.songs.length)
    {
        await deleteSavedQueueFile(this);
    }

    this.songs = [];
    this.loopType = 0;

    this.boundEvents.forEach(function (boundEvent) {

        if (boundEvent.owner && boundEvent.function) {
            boundEvent.owner.removeListener(boundEvent.event, boundEvent.function);
        }
    })

    this.emit('state', 'Destroyed');

    LavaManager.leave(this.Id);

    queues.delete(this.Id);
}


/**
 * @Class A Wrapper class for song queues 
 */
module.exports.Queue = class Queue extends EventEmitter {

    constructor(ctx) {
        super();

        if (ctx === undefined) return;

        this.boundEvents = [];

        switch(ctx.loadType)
        {
            case 0: // Regular Queue Loading
            this.Id = ctx.member.guild.id;
            this.channel = ctx.channel;
            this.voice = ctx.member.voice.channel;
            break;

            case 1: // Loading A Queue From Another Queue
            const properties = Object.getOwnPropertyNames(ctx);

            const propertiesToCopyIfFound = ['Id', 'channel', 'voice', 'player', 'songs', 'nowPlayingMessage', 'currentSong', 'volume', 'isIdle', 'loopType', 'isCreatingNowPlaying', 'isFirstPlay', 'isSwitchingChannels', 'isDisconnecting']

            const currentQueue = this;

            propertiesToCopyIfFound.forEach(function (property) {

                if (properties.includes(property)) {

                    currentQueue[property] = ctx[property];
                }
            });

            if (this.player !== undefined) {
                const playerEndBind = onSongEnd.bind(this);
                this.player.on('end', playerEndBind);
                this.boundEvents.push({ owner: this.player, event: 'end', function: playerEndBind })
            }
            break;

            case 2: // Loading A Queue From File
            this.Id = ctx.Id;
            this.channel = ctx.channel;
            this.voice = ctx.voice;
            this.songs = ctx.songs;
            this.loopType = ctx.loopType;
            this.volume = ctx.volume;
            this.currentSong = ctx.currentSong;
            break;

        }

        if (!this.player) this.player = undefined;
        if (!this.songs) this.songs = []
        if (!this.nowPlayingMessage) this.nowPlayingMessage = undefined;
        if (!this.currentSong) this.currentSong = undefined
        if (!this.volume) this.volume = defaultVolumeMultiplier;
        if (this.isIdle === undefined) this.isIdle = true;
        if (!this.loopType) this.loopType = 0;
        if (this.isCreatingNowPlaying === undefined) this.isCreatingNowPlaying = false;
        if (this.isFirstPlay === undefined) this.isFirstPlay = true;
        if (this.isSwitchingChannels === undefined) this.isSwitchingChannels = false;
        if (this.isDisconnecting === undefined) this.isDisconnecting = false;
        this.ensurePlayTimeout = undefined;




        this.timeout = setTimeout(destroyQueue.bind(this), queueTimeout);

        const voiceStateUpdateBind = voiceStateUpdate.bind(this);
        bot.ws.on('VOICE_STATE_UPDATE', voiceStateUpdateBind);

        this.boundEvents.push({ owner: bot.ws, event: 'VOICE_STATE_UPDATE', function: voiceStateUpdateBind })

    }
}

/**
 * Creates a new queue.
 * @param ctx The context of the command
 * @returns A new queue.
 */
module.exports.createQueue = function (ctx) {

    ctx.loadType = 0;

    const newQueue = new module.exports.Queue(ctx);

    queues.set(ctx.member.guild.id, newQueue);

    return newQueue;
}

function songToSavableData(song)
{
    return {
        url : song.uri,
        userId : song.requester.id
    };
}


async function deleteSavedQueueFile(Queue)
{
    if(!(await fs.access(`${queuesPath}/${Queue.Id}.json`)))
    try {
        await fs.unlink(`${queuesPath}/${Queue.Id}.json`);
    } catch (error) {
        utils.log(error);
    }
}

async function saveQueueToFile(Queue)
{
    const payloadToSave = {};

    payloadToSave.guild = Queue.Id;

    payloadToSave.voice = Queue.voice.id;

    payloadToSave.channel = Queue.channel.id;

    payloadToSave.volume = Queue.volume;

    payloadToSave.loopType = Queue.loopType;

    payloadToSave.songs = [];

    if(Queue.currentSong)
    {
        payloadToSave.songs.push(songToSavableData(Queue.currentSong))
    }

    Queue.songs.forEach(song => payloadToSave.songs.push(songToSavableData(song)));

    try {
        await fs.writeFile(`${queuesPath}/${Queue.Id}.json`,JSON.stringify(payloadToSave,null,4));
    } catch (error) {
        utils.log(error);
    }
}

async function loadSavedSong(guild,songData,priority,songArray)
{
    const songUrl = songData.url;

    const member = await guild.members.fetch(songData.userId);

    const songs = await getSongs(songUrl, member, false);

    if (songs[0]){
        songs[0].priority = priority;
        songArray.push(songs[0]);
    } 
}

async function loadQueueFromFile(filename){

    const fullPath = `${queuesPath}/${filename}`;

    const file = await fs.readFile(fullPath,'utf-8').catch((error)=>{utils.log(error)});

    const QueueDataAsJson = JSON.parse(file);

    if(!QueueDataAsJson.guild || !QueueDataAsJson.voice || !QueueDataAsJson.channel || !QueueDataAsJson.songs || !QueueDataAsJson.songs.length){
        await fs.unlink(fullPath);
        utils.log('Deleting invalid saved queue',filename);
    }
    
    const Id = QueueDataAsJson.guild;

    if(!await bot.guilds.fetch(Id)) return;

    const guild = await bot.guilds.fetch(Id);

    const voice = await guild.channels.fetch(QueueDataAsJson.voice);

    const channel = await guild.channels.fetch(QueueDataAsJson.channel);

    const songs = QueueDataAsJson.songs;

    const loadedSongs = [];

    const songLoaders = [];

    songs.forEach(function (songData,index){
        songLoaders.push(loadSavedSong(guild,songData,index,loadedSongs));
    });

    await Promise.all(songLoaders);

    loadedSongs.sort(function (a,b) {
        return a.priority - b.priority;
    });

    const ctx = {
        Id : Id,
        voice : voice,
        channel : channel,
        songs : loadedSongs,
        loopType : QueueDataAsJson.loopType || 0,
        volume : QueueDataAsJson.volume || defaultVolumeMultiplier,
    }

    ctx.loadType = 2;

    

    const queue = new module.exports.Queue(ctx);
    queues.set(Id,queue);

    const player = await LavaManager.join({
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

    
    fs.readdir(queuesPath).then((files)=>{

        if(!files.length) return;

        const guilds = Array.from(bot.guilds.cache.keys());

        files.forEach(file => {
            if(guilds.indexOf(file.split('.')[0]) !== -1)
            {
                loadQueueFromFile(file);
            }
        })
    });
}

if (bot) {
    modulesLastReloadTime.music = bot.uptime;
}

