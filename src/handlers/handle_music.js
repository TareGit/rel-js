const { sync, bot, queues, perGuildData, LavaManager, modulesLastReloadTime, db, commands } = require(`${process.cwd()}/passthrough.js`);

const { reply, reloadCommandCategory, logError } = sync.require(`${process.cwd()}/utils.js`);
const { queueTimeout, queueItemsPerPage, maxQueueFetchTime, maxRawVolume, defaultVolumeMultiplier, leftArrowEmoji, rightArrowEmoji } = sync.require(`${process.cwd()}/config.json`);

const { MessageEmbed, MessageActionRow, MessageButton, InteractionCollector, Interaction } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, AudioPlayerState, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const EventEmitter = require("events");



const axios = require('axios');

const { URLSearchParams } = require("url");


module.exports.createQueue = async function (ctx) {

    if (queues.get(ctx.member.guild.id) == undefined) {

        return createNewQueue(ctx);
    }
    else {
        return queues.get(ctx.member.guild.id);
    }

}

function createNewQueue(ctx) {
    const newQueue = new Queue(ctx);

    queues.set(ctx.member.guild.id, newQueue);

    return newQueue;
}

function checkLink(link) {
    try {
        const spotifyExpression = /^(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/)(?:embed)?\/?(track|album|playlist)(?::|\/)((?:[0-9a-zA-Z]){22}))/;
        const spMatch = link.match(spotifyExpression);

        if (spMatch) {
            const type = spMatch[1]
            const id = spMatch[2]

            return { type: `spotify-${type}`, id: id }
        }

        return { type: 'search' };
    } catch (error) {
        logError(`Error validating play url "${link}"`,error);
        return { type: 'search' };
    }


}

async function fetchSpotifyTrack({ id }) {
    const headers = {
        'Authorization': `Bearer ${process.env.SPOTIFY_API_TOKEN}`
    }

    const data = (await axios.get(`${process.env.SPOTIFY_API}/tracks/${id}`, { headers: headers })).data;

    return data;
}

async function fetchSpotifyAlbumTracks({ id }) {

    const headers = {
        'Authorization': `Bearer ${process.env.SPOTIFY_API_TOKEN}`
    }

    const data = (await axios.get(`${process.env.SPOTIFY_API}/albums/${id}/tracks`, { headers: headers })).data;

    return data.items;

}

async function fetchSpotifyPlaylistTracks({ id }) {

    const headers = {
        'Authorization': `Bearer ${process.env.SPOTIFY_API_TOKEN}`
    }

    const data = (await axios.get(`${process.env.SPOTIFY_API}/playlists/${id}/tracks?fields=items(track(artists,name))`, { headers: headers })).data;
    
    return data.items;
}

// function to create a song class (for the sake of consistency and sanity)
const createSong = function (songData, songRequester, songGroupURL = "") {
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

async function getSong(search, user) {
    try {
        const node = LavaManager.idealNodes[0];

        const params = new URLSearchParams();

        params.append("identifier", "ytsearch:" + search);

        const data = (await axios.get(`http://${node.host}:${node.port}/loadtracks?${params}`, { headers: { Authorization: node.password } })).data;

        const songData = data.tracks[0];

        if(songData === undefined) return undefined;

        if (songData.info === undefined) return undefined;

        return createSong(songData, user, songData.info.uri);
    } catch (error) {
        logError(`Error fetching song for "${search}"`,error);
        return undefined;
    }

}

function trackFetchTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const convertSpotifyToSong = async function (ctx, trackData, songList) {

    let artists = "";

    trackData.artists.forEach(element => artists += ' ' + element.name);

    const searchToMake = trackData.name + ' ' + artists + ' audio';

    const song = await Promise.race([getSong(searchToMake, ctx.member), trackFetchTimeout(maxQueueFetchTime)]);;

    if (song === undefined) return;

    songList.push(song);
}

const createNowPlayingMessage = async function (ref, targetChannel = undefined) {

    const channel = targetChannel == undefined ? ref.channel : targetChannel;

    let song = ref.currentSong;

    if (ref.isCreatingNowPlaying) return undefined;

    ref.isCreatingNowPlaying = true;


    if (song == undefined) {
        // wait for half a second
        await new Promise(r => setTimeout(r, 500));

        song = ref.currentSong;

        if (song == undefined) {
            ref.isCreatingNowPlaying = false;
            return;
        }
    }

    // remove previous NowPlaying
    if (ref.nowPlayingMessage != undefined) {
        ref.nowPlayingMessage.stop('EndOfLife');
        ref.nowPlayingMessage = undefined;
    }

    const Embed = new MessageEmbed();
    Embed.setColor(perGuildData.get(ref.Id).color);
    Embed.setTitle(`**${song.title}**`);
    Embed.setURL(`${song.uri}`);
    Embed.setDescription(`**Volume** : **${parseInt(ref.volume * 100)}%**`);
    Embed.setFooter(`${song.requester.displayName}`, song.requester.displayAvatarURL({ format: 'png', size: 32 }));
    const nowButtons = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('skip')
                .setLabel('Skip')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId(ref.isPaused() ? 'resume' : 'pause')
                .setLabel(ref.isPaused() ? 'Resume' : 'Pause')
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

    const message = await channel.send({ embeds: [Embed], components: [nowButtons] });
    if (message) {

        const nowPlayingCollector = new InteractionCollector(bot, { message: message, componentType: 'BUTTON' });
        nowPlayingCollector.queue = ref;


        nowPlayingCollector.on('collect', async (button) => {

            await button.deferUpdate();

            button.cType = 'COMMAND';

            button.forceChannelReply = true;

            switch (button.customId) {
                case 'pause':
                    if(commands.get('pause') !== undefined) await commands.get('pause').execute(button);
                    break;

                case 'resume':
                    if(commands.get('resume') !== undefined) await commands.get('resume').execute(button);
                    break;

                case 'queue':
                    if(commands.get('queue') !== undefined) await commands.get('queue').execute(button);
                    break;

                case 'skip':
                    if(commands.get('skip') !== undefined) await commands.get('skip').execute(button);
                    break;

                case 'stop':
                    if(commands.get('stop') !== undefined) await commands.get('stop').execute(button);
                    break;
            }

            button.forceChannelReply = undefined;

            const editedNowButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('skip')
                        .setLabel('Skip')
                        .setStyle('PRIMARY'),
                    new MessageButton()
                        .setCustomId(nowPlayingCollector.queue.isPaused() ? 'resume' : 'pause')
                        .setLabel(nowPlayingCollector.queue.isPaused() ? 'Resume' : 'Pause')
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
                        .setCustomId(nowPlayingCollector.queue.isPaused() ? 'resume' : 'pause')
                        .setLabel(nowPlayingCollector.queue.isPaused() ? 'Resume' : 'Pause')
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
            });
        });

        ref.nowPlayingMessage = nowPlayingCollector;

    }

    ref.isCreatingNowPlaying = false;

}

const generateQueueEmbed = function (page, ref) {

    const currentQueueLenth = ref.queue.length;
    const itemsPerPage = queueItemsPerPage;
    const prevCurrentPages = Math.ceil((currentQueueLenth / itemsPerPage))
    const currentPages = prevCurrentPages < 1 ? 1 : prevCurrentPages;

    const Embed = new MessageEmbed();
    Embed.setColor(perGuildData.get(ref.Id).color);
    Embed.setTitle(`${currentQueueLenth} in Queue`);
    Embed.setURL(process.env.WEBSITE);

    const max = currentQueueLenth > itemsPerPage ? itemsPerPage * page : currentQueueLenth;

    const startIndex = max > itemsPerPage ? (max - itemsPerPage) : 0;

    for (let i = startIndex; i < max; i++) {
        let currentSong = ref.queue[i];

        if (currentSong != undefined) Embed.addField(`${i}) \`${currentSong.title}\``, `**Requested by** ${currentSong.requester} \n`, false);

    }

    Embed.setFooter(`Page ${page} of ${currentPages}`);


    return [Embed, currentPages];
}



class Queue extends EventEmitter {

    constructor(ctx) {
        super();

        if (ctx === undefined) return;

        this.voiceStateUpdateBind = this.voiceStateUpdate.bind(this);
        this.songEndBind = this.songEnd.bind(this);

        if (ctx.__proto__.constructor.name === 'Queue') {
            
            const properties = Object.getOwnPropertyNames(ctx);

            const propertiesToCopyIfFound = ['Id', 'channel', 'voiceChannel', 'player', 'queue', 'nowPlayingMessage', 'currentSong', 'volume', 'isIdle', 'isLooping', 'isCreatingNowPlaying', 'isFirstPlay', 'isSwitchingChannels', 'isDisconnecting']

            const currentQueue = this;

            propertiesToCopyIfFound.forEach(function (property) {

                if (properties.includes(property)) {

                    currentQueue[property] = ctx[property];
                    
                }
            });

            if (this.player !== undefined) {

                this.player.on("end", this.songEndBind);
            }


        }
        else {
            this.Id = ctx.member.guild.id;
            this.channel = ctx.channel;
            this.voiceChannel = ctx.member.voice.channel;
        }


        if (this.player === undefined) this.player = undefined;
        if (this.queue === undefined) this.queue = []
        if (this.nowPlayingMessage === undefined) this.nowPlayingMessage = undefined;
        if (this.currentSong === undefined) this.currentSong = undefined
        if (this.volume === undefined) this.volume = defaultVolumeMultiplier;
        if (this.isIdle === undefined) this.isIdle = true;
        if (this.isLooping === undefined) this.isLooping = false;
        if (this.isCreatingNowPlaying === undefined) this.isCreatingNowPlaying = false;
        if (this.isFirstPlay === undefined) this.isFirstPlay = true;
        if (this.isSwitchingChannels === undefined) this.isSwitchingChannels = false;
        if (this.isDisconnecting === undefined) this.isDisconnecting = false;
        this.ensurePlayTimeout = undefined;


        this.timeout = setTimeout(this.destroyQueue, queueTimeout, this);
        bot.ws.on("VOICE_STATE_UPDATE", this.voiceStateUpdateBind);

    }

    voiceStateUpdate(data) {
        if (data.guild_id === this.Id && data.user_id === bot.user.id) {
            if (data.channel_id === null && !this.isSwitchingChannels) {
                this.destroyQueue(this);
            }
        }
    }

    async ensurePlay(ref) {
        if (!ref.isPlaying() && !ref.isPaused() && ref.queue.length > 0) {
            ref.playNextSong();
        }
    }

    async songEnd(data) {
        if (data.reason === "REPLACED") return; // Ignore REPLACED reason to prevent skip loops

        this.emit('state', 'Finished');

        if (this.nowPlayingMessage != undefined) {
            this.nowPlayingMessage.stop('EndOfLife');
            this.nowPlayingMessage = undefined;
        }

        if (this.isLooping) {
            this.queue.push(this.currentSong);
        }

        this.playNextSong();
    }

    async playNextSong() {

        if (this.timeout != undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        if (this.queue.length == 0) {
            this.timeout = setTimeout(this.destroyQueue, queueTimeout, this);
            this.isIdle = true;
            this.emit('state', 'Idle');
            return;
        }

        try {

            const song = this.queue[0];

            this.currentSong = song;

            if (this.isFirstPlay) {
                this.player.play(song.track, { "volume": this.volume * maxRawVolume });
                this.isFirstPlay = false;
            }
            else {
                this.player.play(song.track);
            }


            createNowPlayingMessage(this);

            this.queue.shift();

            this.emit('state', 'Playing');

        } catch (error) {

            logError(`Error playing song `,error);

            this.queue.shift();

            this.playNextSong();

            return
        }


    }

    async parseInput(ctx) {

        let url = "";

        if (ctx.cType != "MESSAGE") await ctx.deferReply(); // defer because this might take a while

        if (this.player === undefined) {

            this.player = await LavaManager.join({
                guild: ctx.member.guild.id, // Guild id
                channel: ctx.member.voice.channel.id, // Channel id
                node: "1", // lavalink node id, based on array of nodes
            });

            this.player.on("end", this.songEndBind);
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


        if (url.length == 0) return reply(ctx, 'What even is that ?');


        let newSongs = [];


        const check = checkLink(url);

        // Fetch song data
        try {
            // Simple yt video shit
            if (check.type === "search") // handle just a regular search term
            {
                const song = await getSong(url, ctx.member, false);

                if (song) newSongs.push(song);
            }
            else if (check.type == 'spotify-track') {
                const spotifyData = await fetchSpotifyTrack(check)

                const song = await convertSpotifyToSong(ctx, spotifyData, newSongs);
            }
            else if (check.type == 'spotify-album') {
                const tracks = await fetchSpotifyAlbumTracks(check);

                const promisesToAwait = [];

                tracks.forEach(data => {
                    promisesToAwait.push(convertSpotifyToSong(ctx, data, newSongs));
                });

                await Promise.all(promisesToAwait);

            }
            else if (check.type == 'spotify-playlist') {
                const tracks = await fetchSpotifyPlaylistTracks(check);

                const promisesToAwait = [];

                tracks.forEach(data => {
                    promisesToAwait.push(convertSpotifyToSong(ctx, data.track, newSongs));
                });

                await Promise.all(promisesToAwait);
            }
        } 
        catch (error) {
            logError(`Error fetching song for url "${url}"`,error);

            }

        this.queue.push.apply(this.queue, newSongs);


        if (this.isIdle) {
            this.isIdle = false;

            this.playNextSong();

            if (newSongs[0] == undefined) return reply(ctx, "The music could not be loaded");


            if (ctx.cType !== "MESSAGE") reply(ctx, "Playing");

        }
        else {
            const Embed = new MessageEmbed();

            Embed.setColor(perGuildData.get(this.Id).color);
            Embed.setFooter(`Added to the Queue`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            if (newSongs.length > 1) {
                Embed.setTitle(`${newSongs.length} Songs`);
                Embed.setURL(`${url}`);
            }
            else {
                if (newSongs[0] == undefined) return reply(ctx, "The music could not be loaded");

                Embed.setTitle(`${newSongs[0].title}`);
                Embed.setURL(`${newSongs[0].uri}`)

            }

            reply(ctx, { embeds: [Embed] })
        }


    }

    async pauseSong(ctx) {
        if (this.isPlaying() && !this.isPaused()) {
            this.emit('state', 'Paused');

            await this.player.pause(true);

            const Embed = new MessageEmbed();
            Embed.setColor(perGuildData.get(this.Id).color);
            Embed.setURL(process.env.WEBSITE);
            Embed.setFooter(`${ctx.member.displayName} paused the music`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            reply(ctx, { embeds: [Embed] })
        }
    }

    async resumeSong(ctx) {

        if (this.isPaused()) {
            this.emit('state', 'Resumed');

            await this.player.pause(false);

            const Embed = new MessageEmbed();
            Embed.setColor(perGuildData.get(this.Id).color);
            Embed.setURL(process.env.WEBSITE);
            Embed.setFooter(`${ctx.member.displayName} Un-Paused the music`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            reply(ctx, { embeds: [Embed] })
        }


    }

    async removeSong(ctx) {

    }

    async showNowPlaying(ctx) {

        if (this.isPlaying()) {
            if (this.nowPlayingMessage != undefined) {
                this.nowPlayingMessage.stop('EndOfLife');
                this.nowPlayingMessage = undefined;
            }

            await createNowPlayingMessage(this, ctx.channel);
        }
    }

    async setLooping(ctx) {


        if (ctx.args[0] == undefined) return reply(ctx, 'Please use either `loop on` or `loop off`');

        const Embed = new MessageEmbed();
        Embed.setColor(perGuildData.get(this.Id).color);

        Embed.setURL(process.env.WEBSITE);
        Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));



        if (ctx.args[0].toLowerCase() == 'on') {
            this.isLooping = true;
            Embed.setFooter(`Looping On`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));
        } else if (ctx.args[0].toLowerCase() == 'off') {
            this.isLooping = false;
            Embed.setFooter(`Looping Off`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));
        } else {
            reply(ctx, 'Please use either `loop on` or `loop true`');
            return
        }

        reply(ctx, { embeds: [Embed] })

    }

    async showQueue(ctx) {

        if (this.queue.length > queueItemsPerPage) {
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

            const message = await reply(ctx, { embeds: [generateQueueEmbed(1, this)[0]], components: [showQueueButtons] });
            if (message) {

                const queueCollector = new InteractionCollector(bot, { message: message, componentType: 'BUTTON', idle: 7000 });
                queueCollector.resetTimer({ time: 7000 });
                queueCollector.currentPage = 1;
                queueCollector.queue = this;
                queueCollector.owner = (ctx.author !== null && ctx.author !== undefined) ? ctx.author.id : ctx.user.id;

                queueCollector.on('collect', async (button) => {

                    if (button.user.id !== queueCollector.owner) {
                        return reply(button, { ephemeral: true, content: "why must thou choose violence ?" });
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

                    const generatedData = generateQueueEmbed(queueCollector.currentPage, queueCollector.queue);

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
                    });
                });

            }
            else {

                reply(ctx, { embeds: [generateQueueEmbed(1, this)[0]] });
            }


        }
        else {
            reply(ctx, { embeds: [generateQueueEmbed(1, this)[0]] });
        }

    }

    async saveQueue(ctx) {

    }

    async loadQueue(ctx) {
    }

    async setVolume(ctx) {
        if (ctx.args[0] == undefined) return reply(ctx, 'IDK what song you wanna set the volume to');


        const volume = parseInt(ctx.args[0]);

        if (volume !== volume) {
            reply(ctx, 'Bruh is that even a number ?');
            return;
        }

        if (volume < 1 || volume > 100) {
            reply(ctx, 'Please use a value between 1 and 100');
            return;
        }

        this.volume = (volume / 100);

        this.player.volume(this.volume * maxRawVolume);


        const Embed = new MessageEmbed();
        Embed.setColor(perGuildData.get(this.Id).color);
        Embed.setURL(process.env.WEBSITE);
        Embed.setFooter(`${ctx.member.displayName} Changed the volume to ${parseInt(this.volume * 100)}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

        reply(ctx, { embeds: [Embed] })
    }

    async skipSong(ctx) {
        if (this.queue.length != 0 || (this.isPlaying && this.isLooping === true)) {

            const Embed = new MessageEmbed();
            Embed.setColor(perGuildData.get(this.Id).color);
            Embed.setURL(process.env.WEBSITE);
            Embed.setFooter(`${ctx.member.displayName} Skipped the song`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            await this.player.stop();


            reply(ctx, { embeds: [Embed] });


        }
        else {

            if(this.isPlaying)
            {
                return await this.stop(ctx);
            }

            const Embed = new MessageEmbed();
            Embed.setColor(perGuildData.get(this.Id).color);
            Embed.setURL(process.env.WEBSITE);
            Embed.setFooter(`The Queue is empty`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            reply(ctx, { embeds: [Embed] });
        }


    }

    async stop(ctx) {

        const Embed = new MessageEmbed();
        Embed.setColor(perGuildData.get(this.Id).color);
        Embed.setURL(process.env.WEBSITE);
        Embed.setFooter(`${ctx.member.displayName} Disconnected Me`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));


        reply(ctx, { embeds: [Embed] })

        this.destroyQueue(this);
    }

    isPlaying() {
        return this.player.playing || this.player.paused;
    }

    isPaused() {
        return this.player.paused;
    }

    async destroyQueue(ref) {

        if (ref.isDisconnecting) return

        ref.isDisconnecting = true;

        if (ref.nowPlayingMessage != undefined) {
            ref.nowPlayingMessage.stop('EndOfLife');
            ref.nowPlayingMessage = undefined;
        }

        if (ref.timeout != undefined) {
            clearTimeout(ref.timeout);
            ref.timeout = undefined;
        }

        ref.queue = [];
        ref.isLooping = false;

        ref.emit('state', 'Destroyed');

        LavaManager.leave(ref.Id);

        queues.delete(ref.Id);
    }

}

module.exports.Queue = Queue;

console.log('\x1b[32mMusic Module loaded\x1b[0m');

if (modulesLastReloadTime.music !== undefined) {

    reloadCommandCategory('Music');

    try {
        queues.forEach(function (queue, key) {

            const oldQueue = queue;

            const newQueue = new Queue(oldQueue);

            bot.ws.removeListener("VOICE_STATE_UPDATE", oldQueue.voiceStateUpdateBind);

            oldQueue.player.removeListener("end", oldQueue.songEndBind);



            if (oldQueue.timeout != undefined) {
                clearTimeout(oldQueue.timeout);
                oldQueue.timeout = undefined;
            }

            oldQueue.player == undefined;

            queues.set(key, newQueue);

        })
    } catch (error) {
        logError(`Error transfering old queue data`,error);
    }

}

modulesLastReloadTime.music = bot.uptime;