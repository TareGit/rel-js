const play = require('play-dl')
const Voice = require('@discordjs/voice');
const spotify = require('spotify-url-info');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

let botClient = undefined;
const messageDeleteDelay = 2500;
module.exports.musicManager = class musicManager {

    constructor(bot) {
        this.bot = bot;
        this.Queues = new Map();
        this.asyncInteractionCreate = async (interaction) => {

            let dummyObject = new Object();
            dummyObject.ctx = interaction;
            dummyObject.reply = async function (reply) {
                return await interaction.editReply(reply);
            };

            const action = interaction.customId.split('-')[1];

            switch (action) {
                case 'skip':
                    await this.skip(dummyObject);
                    break;

                case 'toggle':
                    await this.pauseToggle(dummyObject);
                    break;

                case 'stop':
                    await this.pause(dummyObject);
                    break;

                case 'queue':
                    await this.showQueue(dummyObject);
                    break;
            }


        }

        this.bot.on('interactionCreate', interaction => {
            if (!interaction.isMessageComponent() || interaction.customId.split('-')[0] != 'music') {
                return;
            }

            interaction.deferReply().then(result => {
                this.asyncInteractionCreate(interaction).then(result => {

                });
            });

        });
    }

    async notice(command, message) {
        const Embed = new MessageEmbed();
        Embed.setColor('#0099ff');
        Embed.setTitle('Music | Notice');
        Embed.setURL('https://oyintare.dev/');
        Embed.setDescription(message);
        const awaitedmessage = await command.reply({ embeds: [Embed] });
        if (awaitedmessage) {
            setTimeout(() => awaitedmessage.delete(), messageDeleteDelay);
        }
    }

    async deletePlayer(Id, Queues) {
        console.log(Id);
        const Queue = Queues.get(Id);
        if (Queue) {
            Queue.player.stop();
            Voice.getVoiceConnection(Queue.Id).destroy();
            Queues.delete(Id);
        }

    }
    async refreshTimeout(Queue) {
        Queue.timeout = setTimeout(this.deletePlayer, 300000, Queue.Id, this.Queues);
    }

    async playSongInternal(Queue) {
        clearTimeout(Queue.timeout);
        Queue.currentResource = undefined;
        if (Queue.songs.length == 0) {
            if (Queue.nowPlayingMessage.channel != undefined) {
                let messageRef = undefined;
                try {
                    messageRef = await Queue.nowPlayingMessage.channel.messages.fetch(Queue.nowPlayingMessage.messageId);
                } catch (error) {
                    console.log('error');
                }

                if (messageRef) {
                    await messageRef.delete();
                }

                Queue.nowPlayingMessage.channel = undefined;
                Queue.nowPlayingMessage.messageId = undefined;
            }
            this.refreshTimeout(Queue);
            return;
        }

        if (Queue.timeout != undefined) {

            Queue.timeout = undefined;
        }

        const song = Queue.songs[0];

        let stream = null;

        try {
            stream = await play.stream(song.url);
            let resource = Voice.createAudioResource(stream.stream, {
                inputType: stream.type,
                inlineVolume: true
            })

            resource.song = song;

            Queue.currentResource = resource;

            resource.volume.setVolume(Queue.volume);

            Queue.player.play(resource, { seek: 0, volume: Queue.volume });

            Queue.songs.shift();


            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');
            Embed.setTitle('Music | Now Playing');
            Embed.setURL('https://oyintare.dev/');
            Embed.setDescription(`**Now Playing** \`${song.title}\` \n**Requested By** ${song.requester} \n **Volume** : **${parseInt(Queue.volume * 100)}%**`);
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

            if (Queue.nowPlayingMessage.channel != undefined) {
                let messageRef = undefined;
                try {
                    messageRef = await Queue.nowPlayingMessage.channel.messages.fetch(Queue.nowPlayingMessage.messageId);
                } catch (error) {
                    console.log('error');
                }

                if (messageRef) {
                    await messageRef.delete();
                }

                Queue.nowPlayingMessage.channel = undefined;
                Queue.nowPlayingMessage.messageId = undefined;
            }
            const newNowPlaying = await Queue.channel.send({ embeds: [Embed], components: [nowButtons] });
            Queue.nowPlayingMessage.channel = newNowPlaying.channel;
            Queue.nowPlayingMessage.messageId = newNowPlaying.id;
        } catch (error) {
            console.log(error);
            const Embed = new MessageEmbed();
            Embed.setColor('#0099ff');
            Embed.setTitle('Music | Notice');
            Embed.setURL('https://oyintare.dev/');
            Embed.setDescription("There was an error While your song");
            Queue.songs.shift();
            this.playSongInternal(Queue);

            return await Queue.channel.send({ embeds: [Embed] });
        }
    }

    async play(command) {

        const ctx = command.ctx;
        const url = command.isInteraction ? ctx.options.getString('url') : command.contentOnly;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        if (url.length == 0) return await this.notice(ctx, "You didn't say what you wanted to play");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let newSong = {};

        let check = await play.validate(url);

        let details = null;

        console.log(url);
        // Fetch song data
        try {
            if (check == 'yt_video') {
                let info = await play.video_basic_info(url);
                details = info.video_details;
            }
            else if (check === 'sp_track') {
                let data = await spotify.getData(url);
                let artists = "";
                if (data.type == 'track') {
                    data.artists.forEach(element => artists += ' ' + element.name);
                }
                let searchToMake = data.name + ' ' + artists + ' audio';
                let search = await play.search(searchToMake, { limit: 1 });
                details = search[0];

            }
            else if (check === "search") {
                let search = await play.search(url, { limit: 1 });
                details = search[0];
            }
        } catch (error) {
            return await this.notice(command, "There was an error processing your song");
        }

        // In case of spotify playlists/albumns
        if (details == null) {
            try {
                return await this.notice(command, "Only spotify tracks are currently supported");
            } catch (error) {

            }
            return
        }

        // Use the data to make a new song
        newSong = { title: details.title, url: details.url, requester: ctx.member };

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
                }
            }

            try {
                // create the player
                Queue.player = Voice.createAudioPlayer({
                    behaviors: {
                        noSubscriber: Voice.NoSubscriberBehavior.Stop
                    }
                })

                Queue.player.on(Voice.AudioPlayerStatus.Idle, () => {
                    this.playSongInternal(Queue);

                });

                const connection = Voice.joinVoiceChannel({
                    channelId: ctx.member.voice.channel.id,
                    guildId: guildId,
                    adapterCreator: ctx.guild.voiceAdapterCreator
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
                        try {
                            connection.destroy();
                        } catch (error) {

                        }

                    }
                });

                connection.subscribe(Queue.player);
            } catch (error) {
                console.log(error);
                this.Queues.delete(guildId, this.Queues);
                return notice(ctx, "You need to be in a voice channel to use this command");
            }

            this.Queues.set(guildId, Queue);
        }

        // add the song to the queue
        Queue.songs.push(newSong);

        if (Queue.currentResource == undefined) {
            // start the queue up
            await command.reply(`Preparing to play ${newSong.title}`);
            await this.playSongInternal(Queue);
        }
        else {
            // notify that its been added
            const Embed = new MessageEmbed();
            Embed.setColor('#0099ff');
            Embed.setTitle('Music | Queue');
            Embed.setURL('https://oyintare.dev/');
            Embed.setDescription(`${newSong.title} ** Added to Queue** \n**Requested By** ${newSong.requester}`)
            const message = await command.reply({ embeds: [Embed] });
            if (message) {
                setTimeout(() => message.delete(), messageDeleteDelay);
            }
        }
    }


    async pauseToggle(command) {
        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        if(Queue.player.state.status == Voice.AudioPlayerStatus.Idle | Queue.player.state.status == Voice.AudioPlayerStatus.Buffering)
        {
            return await this.notice(command, "Nothing is playing");
        }

        if (Queue.player.state.status == Voice.AudioPlayerStatus.Paused) {
            await this.resume(command);
        }
        else {
            console.log("Pausing");
            await this.pause(command);
        }


    }

    async pause(command) {

        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        if (Queue.player.pause()) {
            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');
            Embed.setTitle('Music | Paused');
            Embed.setURL('https://oyintare.dev/');
            Embed.setDescription(`${ctx.member} paused the music`);
            const message = await command.reply({ embeds: [Embed] });
            if (message) {
                setTimeout(() => message.delete(), messageDeleteDelay);
            }

        }

    }

    async skip(command) {

        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(commmand, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        Queue.player.stop();

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Music | Skip');
        Embed.setURL('https://oyintare.dev/');
        Embed.setDescription(`${ctx.member} skipped the song`);
        const message = await command.reply({ embeds: [Embed] });
        if (message) {
            setTimeout(() => message.delete(), messageDeleteDelay);
        }
    }

    async resume(command) {

        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            return
        }

        if (Queue.player.unpause()) {
            const Embed = new MessageEmbed();
            Embed.setColor('#00FF00');
            Embed.setTitle('Music | Resumed');
            Embed.setURL('https://oyintare.dev/');
            Embed.setDescription(`${ctx.member} resumed the music`);
            const message = await command.reply({ embeds: [Embed] });
            if (message) {
                setTimeout(() => message.delete(), messageDeleteDelay);
            }
        }


    }

    async disconnect(command) {
        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            await this.notice(command, "There's no Queue");
            return
        }

        try {
            clearTimeout(Queue.timeout);
            this.deletePlayer(Queue.Id, this.Queues);

        } catch (error) {

        }

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Music | Disconnect');
        Embed.setURL('https://oyintare.dev/');
        Embed.setDescription(`${ctx.member} disconnected me.`);
        await command.reply({ embeds: [Embed] });
    }

    async setVolume(command) {

        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            await this.notice(command, "There's no Queue");
            return
        }
        let volInt = NaN;

        if (!command.isInteraction) {
            try {
                volInt = parseInt(command.getArgs()[0]);
            } catch (error) {
                console.log(error);
                volInt = NaN;
                await this.notice(command, "Please pass in an integer between 1 and 100");
            }

        }

        console.log(volInt);

        let vol = command.isInteraction ? command.ctx.options.getInteger('volume') : volInt;

        if (vol < 1 || vol > 100) {
            return await this.notice(command, "Volume needs to be between 1 and 100");
        }

        Queue.volume = vol / 100;
        if (Queue.currentResource) {
            Queue.currentResource.volume.setVolume(Queue.volume);
        }

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Music | Volume');
        Embed.setURL('https://oyintare.dev/');
        Embed.setDescription(`Volume changed to  **${parseInt(Queue.volume * 100)}%**`);
        const message = await command.reply({ embeds: [Embed] });
        if (message) {
            setTimeout(() => message.delete(), messageDeleteDelay);
        }
    }

    async modifyVolume(command, modifier) {

        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            await this.notice(command, "There's no Queue");
            return
        }

        let volInt = NaN;

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

        let vol = clamp((Queue.volume * 100) + modifier, 1, 100);

        Queue.volume = vol / 100;
        if (Queue.currentResource) {
            Queue.currentResource.volume.setVolume(Queue.volume);
        }

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Music | Volume');
        Embed.setURL('https://oyintare.dev/');
        Embed.setDescription(`Volume changed to  **${parseInt(Queue.volume * 100)}%**`);
        const message = await command.reply({ embeds: [Embed] });
        if (message) {
            setTimeout(() => message.delete(), messageDeleteDelay);
        }

    }

    async showQueue(command) {
        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue) {
            await this.notice(command, "There's no Queue");
            return
        }

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle(`Music | ${Queue.songs.length} in Queue`);
        Embed.setURL('https://oyintare.dev/');

        let count = 0;

        for (let i = 0; i < Queue.songs.length; i++) {
            let currentSong = Queue.songs[i];
            Embed.addField(`${i}) \`${currentSong.title}\``, `**Requested by** ${currentSong.requester} \n`, false);
        }

        await command.reply({ embeds: [Embed] });
        
    }

    async showNowPlaying(command) {
        const ctx = command.ctx;
        if (!ctx.guild || !ctx.member.voice.channel) return await this.notice(command, "You need to be in a voice channel to use this command");
        const voiceChannel = ctx.member.voice.channel;
        const guildId = ctx.guild.id;

        let Queue = this.Queues.get(guildId);

        if (!Queue || !Queue.currentResource) {
            return await this.notice(command, "Nothing's playing");
        }

        let song = Queue.currentResource.song;

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

        const Embed = new MessageEmbed();
        Embed.setColor('#00FF00');
        Embed.setTitle('Music | Now Playing');
        Embed.setURL('https://oyintare.dev/');
        Embed.setDescription(`**Now Playing** \`${song.title}\` \n**Requested By** ${song.requester} \n **Volume** : **${parseInt(Queue.volume * 100)}%**`);
        if (Queue.nowPlayingMessage.channel != undefined) {
            let messageRef = undefined;
            console.log('startingDeletion');
            try {
                messageRef = await Queue.nowPlayingMessage.channel.messages.fetch(Queue.nowPlayingMessage.messageId);
            } catch (error) {
                console.log(error);
            }

            if (messageRef) {
                await messageRef.delete();
            }

            Queue.nowPlayingMessage.channel = undefined;
            Queue.nowPlayingMessage.messageId = undefined;
        }
        const newNowPlaying = await command.reply({ embeds: [Embed], components: [nowButtons] });
        Queue.nowPlayingMessage.channel = newNowPlaying.channel;
        Queue.nowPlayingMessage.messageId = newNowPlaying.id;
    }

}
