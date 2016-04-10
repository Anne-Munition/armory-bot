'use strict';
const mongoose = require('mongoose'),
    url = require('url');

module.exports = function (utils, options) {
    utils.log("Connecting to mongoDB...");

    mongoose.connect(options.mongodb_uri, (err) => {
        if (err) return utils.log("Error connecting to the mongoDB: " + err.message);
        utils.log("Successful connection to mongoDB: '" + url.parse(options.mongodb_uri).pathname.split('/').reverse()[0] + "'");
    });

    var twitterChannelsModel = mongoose.model('twitterchannels', {channel_id: String});

    return {
        twitterChannelsModel: twitterChannelsModel
    }
};
