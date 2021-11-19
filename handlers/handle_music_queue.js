const { queueTimeout } = require(`${process.cwd()}/config.json`);
const play = require('play-dl');
const {createAudioPlayer,createAudioResource,joinVoiceChannel,NoSubscriberBehavior,AudioPlayerState,AudioPlayerStatus} = require('@discordjs/voice');
const async = require('async')
const pify = require('pify')
const { MessageEmbed, MessageActionRow, MessageButton, ReactionUserManager } = require('discord.js');

const Queues = new Map();


module.exports.Queues = Queues;

module.exports.createQueue = async function (bot, ctx) {

    if (Queues.get(ctx.member.guild.id) == undefined) {
        return await new Queue(bot, ctx);
    }
    else {
        return Queues.get(ctx.member.guild.id);
    }

}

async function createNewQueue(bot, ctx) {
    const newQueue = new Queue(bot, ctx);

    Queues.set(ctx.member.guild.id, newQueue);
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

const createNowPlayingMessage = async function (Queue, command) {
    const song = Queue.currentResource.song;
    const Embed = new MessageEmbed();

    Embed.setColor('#00FF00');
    Embed.setTitle(`**${song.title}**`);
    Embed.setURL(`${song.url}`);
    Embed.setThumbnail(`${song.thumbnail}`);
    Embed.setDescription(`**Volume** : **${parseInt(Queue.volume * 100)}%**`);
    Embed.setFooter(`${song.requester.displayName}`, song.requester.displayAvatarURL({ format: 'png', size: 32 }));
    const nowButtons = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('music-skip')
                .setLabel('Skip')
                .setStyle('PRIMARY'),
            new MessageButton()
                .setCustomId('music-toggle')
                .setLabel(`Pause/Resume`)
                .setStyle(`SUCCESS`),
            new MessageButton()
                .setCustomId('music-stop')
                .setLabel('Stop')
                .setStyle('DANGER'),
            new MessageButton()
                .setCustomId('music-queue')
                .setLabel('Queue')
                .setStyle('SECONDARY'),
        );

}



class Queue {

    constructor(bot, ctx) {
        this.Id = ctx.member.guild.id;
        this.channel = ctx.channel;
        this.voiceChannel = ctx.member.voice.channel;
        this.player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Stop } });
        this.queue = []
        this.nowPlaying = null;
        this.volume = 0.05;
        this.isIdle = true;
        this.timeout = setTimeout(this.destroyQueue, queueTimeout, this);

        // handle when the queue goes back to idle
        this.player.on(AudioPlayerStatus.Idle, () => {
            this.playNextSong();
        });


        const connection = joinVoiceChannel({
            channelId: ctx.member.voice.channel.id,
            guildId: ctx.member.guild.id,
            adapterCreator: ctx.guild.voiceAdapterCreator
        });

        connection.subscribe(this.player);

    }

    async playNextSong() {
        if (this.queue.length == 0) {
            this.timeout = setTimeout(this.destroyQueue, queueTimeout, this);
            return;
        }

        if (this.timeout != undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        const song = this.queue[0];

        let stream = null;

        let resource = undefined;

        try {

            stream = await play.stream(song.url);

            resource = createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            })
            console.log("Stream loaded");
        } catch (error) {
            console.log(`\n\n Load Song Error \n\n${error}`);

            this.queue.shift();

            this.playNextSong();

            return
        }

        resource.song = song;
        this.currentResource = resource;
        resource.volume.setVolume(this.volume);

        try {

            this.player.play(resource, { seek: 0, volume: this.volume });
            this.queue.shift();

        } catch (error) {

            console.log(`\n\n Play Song Error \n\n${error}`);

            this.queue.shift();
            this.playNextSong();
            return
        }
    }

    async parseInput(ctx) {

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
                if (contextMessage.embeds[0] != undefined) {
                    url = contextMessage.embeds[0].url;
                }
                else if (contextMessage.content != '') {
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
            else if (check == 'sp_track' || check == 'sp_album' || check == 'sp_playlist') // handle spotify
            {

                if (play.is_expired()) {
                    await play.refreshToken();
                }

                // helper function to convert spotify links to youtube search terms (needs more special sauce)
                let convertTrackToYTSearch = async function (trackData) {
                    let artists = "";
                    if (trackData.type == 'track') {
                        trackData.artists.forEach(element => artists += ' ' + element.name);
                    }
                    const searchToMake = trackData.name + ' ' + artists + ' audio';

                    return (await play.search(searchToMake, { limit: 1 }))[0];
                }

                // fetch the spofity data, could be a song, playlist or albumn
                const dataGotten = await play.spotify(url);

                // time for the serious shit
                if (check == 'sp_track') // for just tracks
                {
                    const details = await convertTrackToYTSearch(dataGotten);

                    if (details) newSongs.push(createSong(details.title, ctx.member, details.thumbnail.url, details.url)); // add if details checks out

                }
                else //  for albumns and playlists (same process)
                {

                    // iterate through all the albumn/playlist pages
                    for (let i = 1; i <= dataGotten.total_pages; i++) {

                        let currentData = dataGotten.page(i);// fetch the songs in this page

                        // use pify to load all songs in parallel (not ordered cus of this but its better than waiting for each song to wait)
                        // might implement some kind of sort later
                        await pify(async.each)(currentData, async (songData) => {

                            // use our special function to get the song data
                            const result = await convertTrackToYTSearch(songData);

                            if (result) newSongs.push(createSong(result.title, ctx.member, result.thumbnail.url, result.url));

                        })

                    }
                }
            }
        } catch (error) { console.log(error) }

        this.queue.push.apply(this.queue, newSongs);

        if (this.isIdle) {
            this.isIdle = false;
            this.playNextSong();
        }
    }

    async pauseSong(ctx){
        if(this.isPlaying() && !this.isPaused())
        {
            this.player.pause();
        }
    }

    async resumeSong(ctx){
        if(this.isPaused())
        {
            this.player.unpause();
        }
    }

    async removeSong(ctx){
        
    }

    async saveQueue(ctx){

    }

    async loadQueue(ctx){

    }

    async showQueue(ctx){

    }

    async showNowPlaying(ctx){

    }

    async skip(ctx){

    }

    function isPlaying() {
        return this.player.state.status == AudioPlayerStatus.Playing || this.player.state.status == AudioPlayerStatus.Paused;
    }

    function isPaused() {
        return this.player.state.status == AudioPlayerStatus.Paused;
    }

    async destroyQueue(ref) {
        Queues.delete(ref.Id);
    }

}