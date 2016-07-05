'use strict';
const mongoose = require('mongoose'),
    url = require('url'),
    utils = require('./utilities.js')();

module.exports = function (options) {
    utils.log("Connecting to mongoDB...");

    mongoose.connect(options.mongodb_uri, (err) => {
        if (err) return utils.log("Error connecting to the mongoDB: " + err.message);
        utils.log("Successful connection to mongoDB: '" + url.parse(options.mongodb_uri).pathname.split('/').reverse()[0] + "'");
    });

    var twitterChannels = mongoose.model('twitter_channels', {
        server_id: String,
        channel_id: String
    });

    var tweetMessages = mongoose.model('twitter_messages', {
        tweet_id: String,
        messages: Array
    });

    var welcomeChannels = mongoose.model('welcome_channels', {
        server_id: String,
        channel_id: String
    });

    var gameQueues = mongoose.model('game_queue', {
        game: String,
        members: [{
            member_id: String,
            tag: String
        }]
    });

    return {
        twitterChannels: twitterChannels,
        tweetMessages: tweetMessages,
        welcomeChannels: welcomeChannels,
        gameQueues: gameQueues
    }
};
