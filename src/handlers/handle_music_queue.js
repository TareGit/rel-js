const ps = require(`${process.cwd()}/passthrough`);

const { queueTimeout, queueItemsPerPage, maxQueueFetchTime } = ps.sync.require(`${process.cwd()}/config.json`);

const play = require('play-dl');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, AudioPlayerState, AudioPlayerStatus, getVoiceConnection } = require('@discordjs/voice');
const EventEmitter = require("events");
const { MessageEmbed, MessageActionRow, MessageButton, InteractionCollector, Interaction } = require('discord.js');
const { response } = require('express');
const { time, clear } = require('console');


module.exports.createQueue = async function (ctx) {

    if (ps.queues.get(ctx.member.guild.id) == undefined) {

        return createNewQueue(ctx);
    }
    else {
        return ps.queues.get(ctx.member.guild.id);
    }

}

function createNewQueue(ctx) {
    const newQueue = new Queue(ctx);

    newQueue.on('state', (state) => {
        console.log(state);
    })

    ps.queues.set(ctx.member.guild.id, newQueue);

    return newQueue;
}

// handle replies
const handleReply = async function (ctx, reply) {
    if (ctx.cType === 'MESSAGE') {
        return await ctx.reply(reply);
    }
    else {
        if (ctx.deferred === true || ctx.replied === true) {
            return await ctx.editReply(reply);
        }
        else {
            return await ctx.reply(reply);
        }
    }
}
// function to create a song class (for the sake of consistency and sanity)
const createSong = function (songTitle, songRequester, songThumbnailURL, songURL, songGroupURL = "") {
    return {
        title: songTitle,
        requester: songRequester,
        thumbnail: songThumbnailURL,
        url: songURL,
        groupURL: songGroupURL
    }
}

const createNowPlayingMessage = async function (ref) {
    const channel = ref.channel;
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

    Embed.setColor(ps.perGuildData.get(ref.guildId).pColor);
    Embed.setTitle(`**${song.title}**`);
    Embed.setURL(`${song.url}`);
    Embed.setThumbnail(`${song.thumbnail}`);
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

        const nowPlayingCollector = new InteractionCollector(ps.bot, { message: message, componentType: 'BUTTON' });
        nowPlayingCollector.queue = ref;


        nowPlayingCollector.on('collect', (button) => {

            button.cType = 'COMMAND';
            switch (button.customId) {
                case 'pause':
                    nowPlayingCollector.queue.pauseSong(button);
                    break;

                case 'resume':
                    nowPlayingCollector.queue.resumeSong(button);
                    break;

                case 'queue':
                    nowPlayingCollector.queue.showQueue(button);
                    break;

                case 'skip':
                    nowPlayingCollector.queue.skipSong(button);
                    break;

                case 'stop':
                    nowPlayingCollector.queue.stop(button);
                    break;
            }

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

            nowPlayingCollector.options.message.fetch().then((message) => {
                if (message) message.edit({ embeds: [Embed], components: [editedNowButtons] });
            });


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
    Embed.setColor(ps.perGuildData.get(ref.guildId).pColor);
    Embed.setTitle(`${currentQueueLenth} in Queue`);
    Embed.setURL('https://www.oyintare.dev/');

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
        this.Id = ctx.member.guild.id;
        this.channel = ctx.channel;
        this.voiceChannel = ctx.member.voice.channel;
        this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });
        this.queue = []
        this.nowPlayingMessage = undefined;
        this.currentSong = undefined
        this.currentResource = undefined;
        this.volume = 0.05;
        this.isIdle = true;
        this.isLooping = false;
        this.isCreatingNowPlaying = false;
        this.ensurePlayTimeout = undefined
        this.timeout = setTimeout(this.destroyQueue, queueTimeout, this);

        // handle when the queue goes back to idle
        this.player.on(AudioPlayerStatus.Idle, () => {

            this.emit('state', 'Finished');

            if (this.nowPlayingMessage != undefined) {
                this.nowPlayingMessage.stop('EndOfLife');
                this.nowPlayingMessage = undefined;
            }

            if (this.isLooping) {
                this.queue.push(this.currentSong);
            }


            this.playNextSong();

            this.ensurePlayTimeout = setTimeout(this.ensurePlay, 1000, this);

        });

        this.player.on(AudioPlayerStatus.Playing, () => {

            if (this.ensurePlayTimeout != undefined) {
                clearTimeout(this.ensurePlayTimeout);
                this.ensurePlayTimeout = undefined;

            }

        });


        const connection = joinVoiceChannel({
            channelId: ctx.member.voice.channel.id,
            guildId: ctx.member.guild.id,
            adapterCreator: ctx.guild.voiceAdapterCreator
        });

        connection.subscribe(this.player);
    }

    async ensurePlay(ref) {
        if (!ref.isPlaying() && !ref.isPaused() && this.queue.length > 0) {
            console.log('THE QUEUE IS TRIPPING ENSURING PLAY');
            ref.playNextSong();
        }
    }

    async playNextSong() {

        if (this.timeout != undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        if (this.queue.length == 0) {
            console.log('Queue Empty');
            this.timeout = setTimeout(this.destroyQueue, queueTimeout, this);
            this.isIdle = true;
            this.emit('state', 'Idle');
            return;
        }

        try {

            console.log('Trying to play');
            const song = this.queue[0];

            const stream = await play.stream(song.url);

            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            })

            this.currentResource = resource;
            this.currentSong = song;

            resource.volume.setVolume(this.volume);

            this.player.play(resource, { seek: 0, volume: this.volume });

            this.queue.shift();

            console.log('FINISHED tryinig to play');

            createNowPlayingMessage(this);

            this.emit('state', 'Playing');

        } catch (error) {

            console.log(`\n\n Play Song Error \n\n${error}`);

            this.queue.shift();

            this.playNextSong();

            return
        }


    }

    async parseInput(ctx) {

        console.log('Play Recieved');
        console.time('ParseSong');
        let url = "";

        if (ctx.cType != "MESSAGE") await command.deferReply(); // defer because this might take a while


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


        if (url.length == 0) return;


        let newSongs = [];


        const check = await play.validate(url);


        // Fetch song data
        try {
            // Simple yt video shit
            if (check === "search") // handle just a regular search term
            {
                const details = (await play.search(url, { limit: 1 }))[0];

                if (details) newSongs.push(createSong(details.title, ctx.member, details.thumbnail.url, details.url));
            }
            else if (check == 'yt_video') {

                const details = (await play.video_basic_info(url)).video_details;

                if (details) newSongs.push(createSong(details.title, ctx.member, details.thumbnail.url, details.url));
            }
            else if (check === 'sp_track' || check === 'sp_album' || check === 'sp_playlist') // handle spotify
            {

                if (play.is_expired()) {
                    await play.refreshToken();
                }

                function timeout(ms) {
                    return new Promise(resolve => setTimeout(resolve, ms));
                }

                

                // helper function to convert spotify links to youtube search terms (needs more special sauce)
                const convertTrackToYTSearch = async function (trackData) {
                    let artists = "";
                    if (trackData.type === 'track') {
                        trackData.artists.forEach(element => artists += ' ' + element.name);
                    }
                    const searchToMake = trackData.name + ' ' + artists + ' audio';

                    return (await play.search(searchToMake, { limit: 1 }))[0];
                }

                const processSpotifyData = async function (trackData) {

                    const details = await Promise.race([convertTrackToYTSearch(trackData), timeout(maxQueueFetchTime)]);

                    if (details == undefined) return;

                    newSongs.push(createSong(details.title, ctx.member, details.thumbnail.url, details.url)); // add if details checks out

                }

                // fetch the spofity data, could be a song, playlist or albumn
                const dataGotten = await play.spotify(url);

                // time for the serious shit
                if (check == 'sp_track') // for just tracks
                {
                    await processSpotifyData(dataGotten);

                }
                else //  for albumns and playlists (same process)
                {

                    // iterate through all the albumn/playlist pages
                    for (let i = 1; i <= dataGotten.total_pages; i++) {

                        let currentData = dataGotten.page(i);// fetch the songs in this page

                        let promisesToAwait = []


                        currentData.forEach(data => {
                            promisesToAwait.push(processSpotifyData(data));
                        });

                        await Promise.all(promisesToAwait);

                    }
                }
            }
        } catch (error) { console.log(error) }

        console.log('Search End');

        this.queue.push.apply(this.queue, newSongs);

        console.timeEnd('ParseSong');


        if (this.isIdle) {
            this.isIdle = false;
            console.log('Play Called');
            this.playNextSong();
        }
        else {
            console.log('Sent to Queue');
            const Embed = new MessageEmbed();

            Embed.setColor(ps.perGuildData.get(this.guildId).pColor);
            Embed.setFooter(`Added to the Queue`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            if (newSongs.length > 1) {
                Embed.setTitle(`${newSongs.length} Songs`);
                Embed.setURL(`${url}`);
            }
            else {
                if (newSongs[0] == undefined) return;

                Embed.setTitle(`${newSongs[0].title}`);
                Embed.setURL(`${newSongs[0].url}`)

            }

            handleReply(ctx, { embeds: [Embed] })
        }


    }

    async pauseSong(ctx) {
        if (this.isPlaying() && !this.isPaused()) {
            this.emit('state', 'Paused');
            this.player.pause();

            const Embed = new MessageEmbed();
            Embed.setColor(ps.perGuildData.get(this.guildId).pColor);
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setFooter(`${ctx.member.displayName} paused the music`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            handleReply(ctx, { embeds: [Embed] })
        }
    }

    async resumeSong(ctx) {

        if (this.isPaused()) {
            this.emit('state', 'Resumed');
            this.player.unpause();

            const Embed = new MessageEmbed();
            Embed.setColor(ps.perGuildData.get(this.guildId).pColor);
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setFooter(`${ctx.member.displayName} Un-Paused the music`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            handleReply(ctx, { embeds: [Embed] })
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

            await createNowPlayingMessage(this);
        }
    }

    async setLooping(ctx) {


        if (ctx.args[0] == undefined) return handleReply(ctx, 'Please use either `loop on` or `loop off`');

        const Embed = new MessageEmbed();
        Embed.setColor(ps.perGuildData.get(this.guildId).pColor);

        Embed.setURL('https://www.oyintare.dev/');
        Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));



        if (ctx.args[0].toLowerCase() == 'on') {
            this.isLooping = true;
            Embed.setFooter(`Looping On`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));
        } else if (ctx.args[0].toLowerCase() == 'off') {
            this.isLooping = false;
            Embed.setFooter(`Looping Off`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));
        } else {
            handleReply(ctx, 'Please use either `loop on` or `loop true`');
            return
        }

        handleReply(ctx, { embeds: [Embed] })

    }

    async showQueue(ctx) {


        if (this.queue.length > queueItemsPerPage) {
            const showQueueButtons = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('previous')
                        .setLabel('⬅️')
                        .setStyle('PRIMARY')
                        .setDisabled(true),
                    new MessageButton()
                        .setCustomId('next')
                        .setLabel(`➡️`)
                        .setStyle(`PRIMARY`),
                );

            const message = await handleReply(ctx, { embeds: [generateQueueEmbed(1, this)[0]], components: [showQueueButtons] });
            if (message) {

                const queueCollector = new InteractionCollector(ps.bot, { message: message, componentType: 'BUTTON', idle: 7000 });
                queueCollector.resetTimer({ time: 7000 });
                queueCollector.currentPage = 1;
                queueCollector.queue = this;

                queueCollector.on('collect', (button) => {

                    const newButtons = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('previous')
                                .setLabel('⬅️')
                                .setStyle('PRIMARY'),
                            new MessageButton()
                                .setCustomId('next')
                                .setLabel(`➡️`)
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

                    queueCollector.options.message.fetch().then((message) => {
                        if (message) message.edit({ embeds: [newEmbed], components: [newButtons] });
                    });


                });

                queueCollector.on('end', (collected, reason) => {

                    const newButtons = new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('previous')
                                .setLabel('⬅️')
                                .setStyle('PRIMARY')
                                .setDisabled(true),
                            new MessageButton()
                                .setCustomId('next')
                                .setLabel(`➡️`)
                                .setStyle(`PRIMARY`)
                                .setDisabled(true),
                        );

                    queueCollector.options.message.fetch().then((message) => {
                        if (message) message.edit({ embeds: [message.embeds[0]], components: [newButtons] });
                    });
                });

            }
            else {

                handleReply(ctx, { embeds: [generateQueueEmbed(1, this)[0]] });
            }


        }
        else {
            handleReply(ctx, { embeds: [generateQueueEmbed(1, this)[0]] });
        }

    }

    async saveQueue(ctx) {

    }

    async loadQueue(ctx) {

    }

    async setVolume(ctx) {
        if (ctx.args[0] == undefined) return handleReply(ctx, 'IDK what song you wanna set the volume to');


        const volume = parseInt(ctx.args[0]);

        if (volume !== volume) {
            handleReply(ctx, 'Bruh is that even a number ?');
            return;
        }

        if (volume < 1 || volume > 100) {
            handleReply(ctx, 'Please use a value between 1 and 100');
            return;
        }

        this.volume = volume / 100;

        if (this.isPlaying()) {
            this.currentResource.volume.setVolume(this.volume);
        }


        const Embed = new MessageEmbed();
        Embed.setColor(ps.perGuildData.get(this.guildId).pColor);
        Embed.setURL('https://www.oyintare.dev/');
        Embed.setFooter(`${ctx.member.displayName} Changed the volume to ${parseInt(this.volume * 100)}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

        handleReply(ctx, { embeds: [Embed] })
    }

    async skipSong(ctx) {
        if (this.isPlaying()) {
            this.player.stop();
            const Embed = new MessageEmbed();
            Embed.setColor(ps.perGuildData.get(this.guildId).pColor);
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setFooter(`${ctx.member.displayName} Skipped the song`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            handleReply(ctx, { embeds: [Embed] })
        }
        else {
            if (this.queue.length != 0) {
                this.playNextSong();
            }
        }
    }

    async stop(ctx) {

        const Embed = new MessageEmbed();
        Embed.setColor(ps.perGuildData.get(this.guildId).pColor);
        Embed.setURL('https://www.oyintare.dev/');
        Embed.setFooter(`${ctx.member.displayName} Disconnected Me`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));


        handleReply(ctx, { embeds: [Embed] })

        this.destroyQueue(this);


    }

    isPlaying() {
        return this.player.state.status == AudioPlayerStatus.Playing || this.player.state.status == AudioPlayerStatus.Paused;
    }

    isPaused() {
        return this.player.state.status == AudioPlayerStatus.Paused;
    }

    async destroyQueue(ref) {
        if (ref.nowPlayingMessage != undefined) {
            ref.nowPlayingMessage.stop('EndOfLife');
            ref.nowPlayingMessage = undefined;
        }

        if (ref.timeout != undefined) {
            clearTimeout(ref.timeout);
            ref.timeout = undefined;
        }

        ref.queue = [];

        ref.emit('state', 'Destroyed');
        if (getVoiceConnection(ref.Id) != undefined) {
            getVoiceConnection(ref.Id).disconnect();
            getVoiceConnection(ref.Id).destroy();
        }

        ps.queues.delete(ref.Id);
    }

}

module.exports.Queue = Queue;