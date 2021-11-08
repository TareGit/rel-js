const play = require('play-dl');
const Voice = require('@discordjs/voice');
const async = require('async')
const pify = require('pify')
const { MessageEmbed, MessageActionRow, MessageButton, ReactionUserManager } = require('discord.js');

// time before a message is deleted
const messageDeleteDelay = 5000;

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

    // Invalidate the current now playing message
    if (Queue.nowPlayingMessage.channel != undefined) {
        let messageRef = undefined;

        try {
            messageRef = await Queue.nowPlayingMessage.channel.messages.fetch(Queue.nowPlayingMessage.messageId);
        } catch (error) {
            console.log(error);
        }

        if (messageRef) {
            if (messageRef.editable) {
                const buttonComponents = messageRef.components[0].components;
                const buttonsToSendBack = new MessageActionRow();

                for (let i = 0; i < buttonComponents.length; i++) {
                    buttonsToSendBack.addComponents(
                        new MessageButton().setCustomId(`${buttonComponents[i].customId}`)
                            .setLabel(`${buttonComponents[i].label}`)
                            .setStyle(`${buttonComponents[i].style}`)
                            .setDisabled(true));

                }

                await messageRef.edit({ embeds: messageRef.embeds, components: [buttonsToSendBack] });
            }

        }

        Queue.nowPlayingMessage.channel = undefined;
        Queue.nowPlayingMessage.messageId = undefined;
    }

    try {
        const newNowPlaying = await Queue.channel.send({ embeds: [Embed], components: [nowButtons] });
        Queue.nowPlayingMessage.channel = newNowPlaying.channel;
        Queue.nowPlayingMessage.messageId = newNowPlaying.id;
    } catch (error) {
        console.log(`\n\n Send Message Error \n\n${error}`);
    }
}

/*
MUSIC BOT CLASS -- HANDLES QUEUES AND SAVED PLAYLISTS (ONE CLASS INSTANCE AT ANY GIVEN TIME)
*/
module.exports.musicManager = class musicManager {

    /*
    CONSTRUCTOR
    */
    constructor(bot, getSettings, updateSettings) {
        this.bot = bot;
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
        this.Queues = new Map();
        this.asyncInteractionCreate = async (interaction) => {

            let dummyObject = new Object();
            dummyObject.ctx = interaction;
            dummyObject.reply = async function (reply) {
                if (interaction.deferred) {
                    return await interaction.editReply(reply);
                }

                return await interaction.reply(reply);
            };

            const action = interaction.customId.split('-')[1];

            switch (action) {
                case 'skip':
                    this.skip(dummyObject);
                    break;

                case 'toggle':
                    this.pauseToggle(dummyObject);
                    break;

                case 'stop':
                    this.disconnect(dummyObject);
                    break;

                case 'queue':
                    this.showQueue(dummyObject);
                    break;
            }


        }

        this.bot.on('interactionCreate', interaction => {
            if (!interaction.isMessageComponent() || interaction.customId.split('-')[0] != 'music') {
                return;
            }

            this.asyncInteractionCreate(interaction).then(result => {

            });

        });
    }

    /*
    SEND NOTICES
    */
    async notice(command, message) {
        const Embed = new MessageEmbed();
        Embed.setColor('#0099ff');
        Embed.setTitle('Notice');
        Embed.setURL('https://www.oyintare.dev/');
        Embed.setDescription(message);

        try {
            if (command.type == "COMMAND" || command.type == "CONTEXT_MENU") {
                command.ctx.reply({ embeds: [Embed] })
            }
            else {

            }

            command.ctx.channel.send({ embeds: [Embed] }).then(function (message) {
                if (message) setTimeout(() => message.delete(), messageDeleteDelay);
            });
        } catch (error) {
            console.log(`\n\n Send | Delete Message Error \n\n${error}`);
        }
    }

    /*
    join the channel the user is in and setup the Queue
    */
    async joinChannel(command) {

        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        // create the queue if it does not exist
        if (!Queue) {

            Queue = {
                Id: guildId,
                channel: ctx.channel,
                volume: 0.05,
                voiceChannel: ctx.member.voice.channel,
                player: null,
                currentResource: undefined,
                songs: [],
                hasMadePlayAttempt: false,
                timeout: undefined,
                nowPlayingMessage: {
                    channel: undefined,
                    messageId: undefined,
                },
                isGettingReadyToPlay: false
            }

            try {
                // create the player
                Queue.player = Voice.createAudioPlayer({
                    behaviors: {
                        noSubscriber: Voice.NoSubscriberBehavior.Stop
                    }
                })

                // handle when the queue goes back to idle
                Queue.player.on(Voice.AudioPlayerStatus.Idle, () => {
                    this.playSongInternal(Queue);
                });


                Queue.player.on('error', (error) => {
                    console.log(`===================== Error : Audio Player ===================== \n${error}`)
                })

                const connection = Voice.joinVoiceChannel({
                    channelId: ctx.member.voice.channel.id,
                    guildId: guildId,
                    adapterCreator: ctx.guild.voiceAdapterCreator
                });

                connection.on('error', (error) => {
                    console.log(`===================== Error : Voice Connection ===================== \n${error}`)
                })

                // handle disconnects
                connection.on(Voice.VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                    try {
                        await Promise.race([
                            Voice.entersState(connection, Voice.VoiceConnectionStatus.Signalling, 5_000),
                            Voice.entersState(connection, Voice.VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                        // Seems to be reconnecting to a new channel - ignore disconnect
                    } catch (error) {
                        // Seems to be a real disconnect which SHOULDN'T be recovered from
                        try {
                            connection.destroy();
                        } catch (error) {

                        }

                    }
                });

                connection.subscribe(Queue.player);
                this.Queues.set(guildId, Queue);
                return Queue;
            } catch (error) {
                console.log(`\n\n Create Queue Error \n\n${error}`);
                notice(command, "There was an error creating the queue");
                return undefined;
            }
        }

    }

    /*
    DELETE A QUEUE
    */
    async deleteQueue(Id, Queues) {
        const Queue = Queues.get(Id);
        if (Queue) {


            // Invalidate the now playing message
            if (Queue.nowPlayingMessage.channel != undefined) {
                let messageRef = undefined;

                try {
                    messageRef = await Queue.nowPlayingMessage.channel.messages.fetch(Queue.nowPlayingMessage.messageId);
                } catch (error) {
                    console.log(error);
                }

                if (messageRef) {
                    if (messageRef.editable) {
                        const buttonComponents = messageRef.components[0].components;
                        const buttonsToSendBack = new MessageActionRow();

                        for (let i = 0; i < buttonComponents.length; i++) {
                            buttonsToSendBack.addComponents(
                                new MessageButton().setCustomId(`${buttonComponents[i].customId}`)
                                    .setLabel(`${buttonComponents[i].label}`)
                                    .setStyle(`${buttonComponents[i].style}`)
                                    .setDisabled(true));

                        }

                        await messageRef.edit({ embeds: messageRef.embeds, components: [buttonsToSendBack] });
                    }

                }

                Queue.nowPlayingMessage.channel = undefined;
                Queue.nowPlayingMessage.messageId = undefined;
            }

            Queue.songs = []
            Queue.currentResource = undefined;
            Queue.player.stop();
            Voice.getVoiceConnection(Queue.Id).disconnect();
            Voice.getVoiceConnection(Queue.Id).destroy();
            Queues.delete(Id);
            return true;
        }
        return false;
    }

    /*
    REFRESH A QUEUE TIMEOUT
    */
    async refreshTimeout(Queue) {
        if (Queue.timeout) {
            clearTimeout(Queue.timeout);
            Queue.timeout = undefined;
        }
        Queue.timeout = setTimeout(this.deleteQueue, 300000, Queue.Id, this.Queues);
    }

    /*
    INTERNAL METHOD TO PLAY A SONG
    */
    async playSongInternal(Queue) {

        

        if (Queue.timeout) {
            clearTimeout(Queue.timeout);
            Queue.timeout = undefined;
        }

        Queue.currentResource = undefined;

        console.log(Queue.songs);

        if (Queue.songs.length == 0) {
            // Invalidate the now playing message
            if (Queue.nowPlayingMessage.channel != undefined) {
                let messageRef = undefined;

                try {
                    messageRef = await Queue.nowPlayingMessage.channel.messages.fetch(Queue.nowPlayingMessage.messageId);
                } catch (error) {
                    console.log(error);
                }

                if (messageRef) {
                    if (messageRef.editable) {
                        const buttonComponents = messageRef.components[0].components;
                        const buttonsToSendBack = new MessageActionRow();

                        for (let i = 0; i < buttonComponents.length; i++) {
                            buttonsToSendBack.addComponents(
                                new MessageButton().setCustomId(`${buttonComponents[i].customId}`)
                                    .setLabel(`${buttonComponents[i].label}`)
                                    .setStyle(`${buttonComponents[i].style}`)
                                    .setDisabled(true));

                        }

                        await messageRef.edit({ embeds: messageRef.embeds, components: [buttonsToSendBack] });
                    }

                }

                Queue.nowPlayingMessage.channel = undefined;
                Queue.nowPlayingMessage.messageId = undefined;
            }

            this.refreshTimeout(Queue);

            // prepare for next startup
            Queue.isGettingReadyToPlay = false;

            return;
        }

        console.log('About to play song');

        
        const song = Queue.songs[0];

        console.log(song);

        let stream = null;

        let resource = undefined;

        try {

            stream = await play.stream(song.url);

            resource = Voice.createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            })
            console.log("Stream loaded");
        } catch (error) {
            console.log(`\n\n Load Song Error \n\n${error}`);

            const Embed = new MessageEmbed();
            Embed.setColor('#0099ff');
            Embed.setTitle('Notice');
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setDescription("An error occoured while trying to load your song");
            Queue.songs.shift();
            this.playSongInternal(Queue);

            try {
                Queue.channel.send({ embeds: [Embed] }).then(function (message) {
                    if (message) setTimeout(() => message.delete(), messageDeleteDelay);
                });
            } catch (error) {
                console.log(`\n\n Send Message Error \n\n${error}`);
            }

            Queue.songs.shift();
            this.playSongInternal(Queue);

            return
        }

        resource.song = song;
        Queue.currentResource = resource;
        resource.volume.setVolume(Queue.volume);

        try {
            console.log("Attempting to play");
            Queue.player.play(resource, { seek: 0, volume: Queue.volume });
            Queue.songs.shift();

        } catch (error) {

            console.log(`\n\n Play Song Error \n\n${error}`);

            const Embed = new MessageEmbed();
            Embed.setColor('#0099ff');
            Embed.setTitle('Notice');
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setDescription("An error occoured while trying to play your song");
            Queue.songs.shift();
            this.playSongInternal(Queue);

            try {

                Queue.channel.send({ embeds: [Embed] }).then(function (message) {
                    if (message) setTimeout(() => message.delete(), messageDeleteDelay);
                });

            } catch (error) {

                console.log(`\n\n Send Message Error \n\n${error}`);

            }

            Queue.songs.shift();
            this.playSongInternal(Queue);
            return
        }

        console.log("Showing now playing message");
        createNowPlayingMessage(Queue);

    }

    /*
    PREPARE TO PLAY A SONG OR ADD IT TO THE QUEUE
    */
    async play(command) {

        console.time('play-command');

        console.time('Play-command-start');
        let url = "";

        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        console.timeEnd('Play-command-start');

        console.time('defer-reply');
        if (this.type != "MESSAGE") await command.deferReply(); // defer because this might take a while
        console.timeEnd('defer-reply');
        // handle different command types

        console.time('get-url');
        switch (command.type) {
            case 'MESSAGE':
                url = command.contentOnly;
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
                    if (contentLow[0] == '.') {
                        url = contextMessage.content.slice(5);
                    }
                    else {
                        url = contextMessage.content;
                    }
                }
                else {
                    return ctx.reply({ content: 'I can\'t add that', ephemeral: true });
                }
                break;
        }
        console.timeEnd('get-url');

        console.time('check-1');
        if (url.length == 0) return this.notice(command, "You didn't say what you wanted to play");
        console.timeEnd('check-1');
        let newSongs = [];

        console.time('get-url-type');
        const check = await play.validate(url);
        console.timeEnd('get-url-type');

        console.time('fetch-data');
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


        } catch (error) {
            console.log(`\n\n Process Song Error \n\n${error}`);
            return this.notice(command, `There was an error processing your song ${url}`);

        }

        console.timeEnd('fetch-data');

        let Queue = this.Queues.get(guildId);


        // create the queue if it does not exist
        console.time('create-queue');
        if (!Queue) Queue = await this.joinChannel(command);
        console.timeEnd('create-queue');

        //incase its still invalid for some reason
        if (!Queue) return this.notice(command, "Unknown Error while creating the Queue");

        console.time('push-songs');
        // add the songs to the queue
        Queue.songs.push.apply(Queue.songs, newSongs);

        console.timeEnd('push-songs');

        console.timeEnd('play-command');
        if (!Queue.isGettingReadyToPlay) {
            if (command.type != 'MESSAGE') command.reply('Preparing to play music');
            // start the queue up
            Queue.isGettingReadyToPlay = true;
            this.playSongInternal(Queue);
        } else {
            // notify that its been added because the queue is active
            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');

            Embed.setFooter(`Added to the Queue`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            if (newSongs.length > 1) {
                Embed.setTitle(`${newSongs.length} Songs`);
                Embed.setURL(`${url}`);
            }
            else {
                Embed.setTitle(`${newSongs[0].title}`);
                Embed.setURL(`${newSongs[0].url}`);
            }

            try {
                command.reply({ embeds: [Embed] })
            } catch (error) {
                console.log(`\n\n Send Message Error \n\n${error}`);
            }
        }
    }

    /*
    TOGGLE PAUSE/UNPAUSE
    */
    async pauseToggle(command) {
        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return;


        if (Queue.player.state.status == Voice.AudioPlayerStatus.Idle
            | Queue.player.state.status == Voice.AudioPlayerStatus.Buffering) return this.notice(command, "Nothing is playing");

        if (Queue.player.state.status == Voice.AudioPlayerStatus.Paused) {

            this.resume(command);
        }
        else {

            this.pause(command);

        }


    }

    /*
    PAUSE CURRENT SONG
    */
    async pause(command) {

        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return;


        if (Queue.player.pause()) {

            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');
            Embed.setTitle('Paused');
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            try {
                command.reply({ embeds: [Embed] }).then(function (message) {
                    if (message) setTimeout(() => message.delete(), messageDeleteDelay);
                });
            } catch (error) {
                console.log(`\n\n Send | Delete Message Error \n\n${error}`);
            }
        }

    }

    /*
    RESUME CURRENT SONG
    */
    async resume(command) {

        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return

        if (Queue.player.unpause()) {

            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');
            Embed.setTitle('UnPaused');
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            try {
                command.reply({ embeds: [Embed] }).then(function (message) {
                    if (message) setTimeout(() => message.delete(), messageDeleteDelay);
                });
            } catch (error) {
                console.log(`\n\n Send | Delete Message Error \n\n${error}`);
            }

        }


    }

    /*
    SKIP CURRENT SONG
    */
    async skip(command) {

        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(commmand, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return;


        Queue.player.stop();

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Skipped');
        Embed.setURL('https://www.oyintare.dev/');
        Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

        try {
            command.reply({ embeds: [Embed] }).then(function (message) {
                if (message) setTimeout(() => message.delete(), messageDeleteDelay);
            });
        } catch (error) {
            console.log(`\n\n Send | Delete Message Error \n\n${error}`);
        }
    }

    /*
    DISCONNECT THE BOT
    */
    async disconnect(command) {
        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return this.notice(command, "Im not even playing anything");

        if (Queue.timeout) {
            clearTimeout(Queue.timeout);
            Queue.timeout = undefined;
        }

        const wasDisconnected = await this.deleteQueue(Queue.Id, this.Queues);
        if (wasDisconnected) {
            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');
            Embed.setTitle('Disconnected');
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            try {
                command.reply({ embeds: [Embed] }).then(function (message) {
                    if (message) setTimeout(() => message.delete(), messageDeleteDelay);
                });
            } catch (error) {
                console.log(`\n\n Send | Delete Message Error \n\n${error}`);
            }
        }
        else {
            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');
            Embed.setTitle('Error While Disconnecting');
            Embed.setURL('https://www.oyintare.dev/');
            Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

            try {
                command.reply({ embeds: [Embed] }).then(function (message) {
                    if (message) setTimeout(() => message.delete(), messageDeleteDelay);
                });
            } catch (error) {
                console.log(`\n\n Send | Delete Message Error \n\n${error}`);
            }
        }


    }

    /*
    CHANGE THE VOLUME
    */
    async setVolume(command) {

        const ctx = command.ctx;

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return this.notice(command, "There's no Queue");

        let volInt = NaN;


        try {
            switch (command.type) {
                case 'MESSAGE':
                    volInt = parseInt(command.getArgs()[0]);
                    break;
                case 'COMMAND':
                    volInt = command.ctx.options.getInteger('volume')
                    break;
                case 'CONTEXT_MENU':
                    break;
            }
        } catch (error) {
            volInt = NaN;
            await this.notice(command, "Please pass in an integer between 1 and 100");
        }

        if (volInt < 1 || volInt > 100) {
            return await this.notice(command, "Volume needs to be between 1 and 100");
        }

        Queue.volume = volInt / 100;
        if (Queue.currentResource) Queue.currentResource.volume.setVolume(Queue.volume);


        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle(`Changed the volume to **${parseInt(Queue.volume * 100)}%**`);
        Embed.setURL('https://www.oyintare.dev/');
        Embed.setFooter(`${ctx.member.displayName}`, ctx.member.displayAvatarURL({ format: 'png', size: 32 }));

        try {
            command.reply({ embeds: [Embed] }).then(function (message) {
                if (message) setTimeout(() => message.delete(), messageDeleteDelay);
            });
        } catch (error) {
            console.log(`\n\n Send | Delete Message Error \n\n${error}`);
        }
    }

    /*
    DISPLAY THE QUEUE
    */
    async showQueue(command) {
        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return this.notice(command, "There's no Queue");

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle(`${Queue.songs.length} in Queue`);
        Embed.setURL('https://www.oyintare.dev/');

        const length = Queue.songs.length <= 20 ? Queue.songs.length : 20;
        for (let i = 0; i < length; i++) {
            let currentSong = Queue.songs[i];
            Embed.addField(`${i}) \`${currentSong.title}\``, `**Requested by** ${currentSong.requester} \n`, false);
        }

        try {
            command.reply({ embeds: [Embed] });
        } catch (error) {
            console.log(`\n\n Send Queue Message Error \n\n${error}`);
        }
    }

    /*
    SHOW THE CURRENT SONG
    */
    async showNowPlaying(command) {
        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue || !Queue.currentResource) return this.notice(command, "Nothing's playing");

        createNowPlayingMessage(Queue);
    }

    /*
    RREMOVE A SONG FROM THE QUEUE
    */
    async removeSong(command) {

    }

    /*
    SAVE THE CURRENT QUEUE
    */
    async saveQueue(command) {

        const settings = this.getSettings();
        const ctx = command.ctx;

        if (!settings) this.notice(command, "Internal Error loading settings");

        if (!ctx.guild || !ctx.member.voice.channel) return this.notice(command, "You need to be in a voice channel to use this command");

        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) return this.notice(command, "There's no Queue");
    }

    /*
    LOAD A QUEUE
    */
    async loadQueue(command) {
        const settings = this.getSettings();
    }

}
