const play = require('play-dl')
const Voice = require('@discordjs/voice');
const spotify = require('spotify-url-info');



module.exports.musicManager = class musicManager {

    constructor(bot, getSettings, updateSettings) {
        this.bot = bot;
        this.Queues = new Map();
        this.getSettings = getSettings;
        this.updateSettings = updateSettings;
    }

    async playSongInternal(Queue) {
        Queue.currentResource = null;
        if (Queue.songs.length == 0) {
            await Voice.getVoiceConnection(Queue.Id).destroy();
            this.Queues.delete(Id);
            return;
        }

        const song = Queue.songs[0];

        let stream = await play.stream(song.url);

        let resource = Voice.createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        })

        Queue.currentResource = resource;

        resource.volume.setVolume(Queue.volume);

        Queue.player.play(resource, { seek: 0, volume: Queue.volume });

        Queue.songs.shift();
        await Queue.channel.send('Now Playing ' + song.title);
    }

    async play(ParsedCommand) {

        const message = ParsedCommand.message;
        const content = ParsedCommand.getContent();
        if (!message.guild) return message.reply("You need to be in a voice channel to use this command");
        const voiceChannel = message.member.voice.channel;
        const guildId = message.guild.id;

        if (!voiceChannel) return message.reply("You need to be in a voice channel to use this command");

        if (ParsedCommand.getContent().trim() == "") return message.reply("I need Some Link or info To Play");

        let newSong = {};

        let check = await play.validate(content);

        let details = null;

        if (check == 'yt_video') {
            let info = await play.video_basic_info(content);
            details = info.video_details;
        }
        else if (check === 'sp_track') {
            let data = await spotify.getData(content);
            let artists = "";
            if (data.type == 'track') {
                data.artists.forEach(element => artists += ' ' + element.name);
            }
            let searchToMake = data.name + ' ' + artists + ' audio';
            console.log(searchToMake);

            let search = await play.search(searchToMake, { limit: 1 });
            details = search[0];

        }
        else if (check === "search") {
            let search = await play.search(content, { limit: 1 });
            details = search[0];
        }

        if (details == null) {
            try {
                let data = await spotify.getData(content);
                console.log(data);
                return message.reply("Not Supported Gee");
            } catch (error) {

            }
            return
        }


        newSong = { title: details.title, url: details.url, requester: message.author };



        let Queue = this.Queues.get(guildId);

        if (!Queue) {

            Queue = {
                Id: guildId,
                channel: message.channel,
                volume: 0.05,
                voiceChannel: message.member.voice.channel,
                player: null,
                currentResource: undefined,
                songs: []
            }
        }

        this.Queues.set(guildId, Queue);

        Queue.songs.push(newSong);

        if (!Queue.player) {
            try {

                Queue.player = Voice.createAudioPlayer({
                    behaviors: {
                        noSubscriber: Voice.NoSubscriberBehavior.Play
                    }
                })
                const connection = Voice.joinVoiceChannel({
                    channelId: message.member.voice.channel.id,
                    guildId: guildId,
                    adapterCreator: message.guild.voiceAdapterCreator
                });


                connection.on(Voice.VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
                    try {
                        await Promise.race([
                            Voice.entersState(connection, Voice.VoiceConnectionStatus.Signalling, 5_000),
                            Voice.entersState(connection, Voice.VoiceConnectionStatus.Connecting, 5_000),
                        ]);
                        // Seems to be reconnecting to a new channel - ignore disconnect
                    } catch (error) {
                        // Seems to be a real disconnect which SHOULDN'T be recovered from
                        connection.destroy();
                    }
                });

                connection.subscribe(Queue.player);
                Queue.player.on(Voice.AudioPlayerStatus.Idle, () => {
                    this.playSongInternal(Queue);
                });
            } catch (error) {
                console.log(error);
                this.Queues.delete(guildId);
                message.reply("There Was An Error");
            }
        }

        if (Queue.currentResource == undefined) {
            this.playSongInternal(Queue);
        }
    }

    async pause(ParsedCommand) {

        const message = ParsedCommand.message;
        if (!message.guild) return message.reply("You need to be in a voice channel to use this command");
        const voiceChannel = message.member.voice.channel;
        const guildId = message.guild.id;

        if (!voiceChannel) return message.reply("You need to be in a voice channel to use this command");

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        Queue.player.pause();
    }


    async skip(ParsedCommand) {

        const message = ParsedCommand.message;
        if (!message.guild) return message.reply("You need to be in a voice channel to use this command");
        const voiceChannel = message.member.voice.channel;
        const guildId = message.guild.id;

        if (!voiceChannel) return message.reply("You need to be in a voice channel to use this command");

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        Queue.player.stop();
    }

    async resume(ParsedCommand) {

        const message = ParsedCommand.message;
        if (!message.guild) return message.reply("You need to be in a voice channel to use this command");
        const voiceChannel = message.member.voice.channel;
        const guildId = message.guild.id;

        if (!voiceChannel) return message.reply("You need to be in a voice channel to use this command");

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        Queue.player.unpause();
    }

    async disconnect(ParsedCommand) {

        
        const message = ParsedCommand.message;
        if (!message.guild) return message.reply("You need to be in a voice channel to use this command");
        const voiceChannel = message.member.voice.channel;
        const guildId = message.guild.id;

        if (!voiceChannel) return message.reply("You need to be in a voice channel to use this command");

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        await Voice.getVoiceConnection(Queue.Id).disconnect();
        this.Queues.delete(Queue.Id);
    }

    async setVolume(ParsedCommand) {

        const message = ParsedCommand.message;
        if (!message.guild) return message.reply("You need to be in a voice channel to use this command");
        const voiceChannel = message.member.voice.channel;
        const guildId = message.guild.id;

        if (!voiceChannel) return message.reply("You need to be in a voice channel to use this command");

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        let vol = parseInt(ParsedCommand.getContent());

        if (vol != NaN) {
            if (vol < 1 || vol > 100) {
                return message.reply("BRUHHHH 1 - 100 PLS");
            }

            Queue.volume = vol / 100;
            Queue.currentResource.volume.setVolume(Queue.volume);
        }
    }

}
