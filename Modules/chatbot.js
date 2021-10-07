
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

    processIntents(message) {
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

            return sessionClient.detectIntent(request).then(responses => {
                const response = responses[0];
                this.lastContext = response.queryResult.outputContexts;
                return message.reply(response.queryResult.fulfillmentText);
            });
        } catch (error) {
        }

    }
}

module.exports.ChatBotManager = class ChatBotManager {

    constructor(Project_ID, bot) {

        this.Project_ID = Project_ID;
        this.childInstances = new Map();
        this.bot = bot;

    }

    processIntents(message) {

        if (message.guild) {

            if (this.childInstances.has(message.guild.id)) {
                return this.childInstances.get(message.guild.id).processIntents(message);
            }
            else {
                this.childInstances.set(message.guild.id, new ChatBot(this.Project_ID, this.bot, message.guild.id));
                return this.childInstances.get(message.guild.id).processIntents(message);
            }
        }
        else {

            if (this.childInstances.has(message.author.id)) {
                return this.childInstances.get(message.author.id).processIntents(message);
            }
            else {
                this.childInstances.set(message.author.id, new ChatBot(this.Project_ID, this.bot, message.author.id));
                return this.childInstances.get(message.author.id).processIntents(message);
            }
        }
    }
}