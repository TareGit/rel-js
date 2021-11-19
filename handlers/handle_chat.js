
// Imports the Dialogflow library
const dialogflow = require('@google-cloud/dialogflow');
// Instantiates a session client
const sessionClient = new dialogflow.SessionsClient();

class ChatBot {

    constructor(Project_ID, bot, sessionId) {

        this.Project_ID = Project_ID;
        this.sessionId = sessionId;
        this.bot = bot;
        this.lastContext;
    }

    async processIntents(message) {
        try {

            const messageContent = message.content;
            if (messageContent.toLowerCase().startsWith('rel')) {
                messageContent.slice(3);
            }

            // The path to identify the agent that owns the created intent.
            const sessionPath = sessionClient.projectAgentSessionPath(
                this.Project_ID,
                this.sessionId
            );

            // The text query request.
            const request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        text: messageContent,
                        languageCode: 'en',
                    },
                },
            };

            if (this.contexts && this.contexts.length > 0) {
                request.queryParams = {
                    contexts: this.contexts,
                };
            }

            let responses = null;
            try {
                responses = await sessionClient.detectIntent(request);
            } catch (error) {
                console.log(error);
            }

            if(responses)
            {
                const response = responses[0]
                this.lastContext = response.queryResult.outputContexts;
                return message.reply(response.queryResult.fulfillmentText);
            }

        } catch (error) {
            console.log(error);
        }

    }
}

module.exports.ChatBotManager = class ChatBotManager {

    constructor(Project_ID, bot) {

        this.Project_ID = Project_ID;
        this.childInstances = new Map();
        this.bot = bot;

    }

    createTimerForInstance(self, ID) {
        let data = this.childInstances;
        return setTimeout(function () {
            const Id = ID;
            try {
                data.delete(ID);
            } catch (error) {
                console.log(error);
            }

        }, 1.2e+6);
    }

    async processIntents(message) {

        let Id = 0;

        if (message.guild) {

            Id = message.guild.id;
        }
        else {
            Id = message.author.id;
        }

        if (this.childInstances.has(Id)) {

            try {
                
                clearTimeout(this.childInstances.get(Id)[1]);

                this.childInstances.get(Id)[1] = this.createTimerForInstance(Id);

            } catch (error) {
                console.log(error);
            }

            return await this.childInstances.get(Id)[0].processIntents(message);

        }
        else {

            try {
                this.childInstances.set(Id,
                    [new ChatBot(this.Project_ID, this.bot, Id), this.createTimerForInstance(Id)]
                );
            } catch (error) {
                console.log(error);
            }
            return await this.childInstances.get(Id)[0].processIntents(message);
        }
    }
}