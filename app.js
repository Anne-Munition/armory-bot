'use strict';
const fs = require('fs'),
    path = require('path'),
    request = require('request'),
    moment = require('moment');

var utils = require('./lib/utilities.js')(moment);
utils.log("Starting Armory Bot...");

try {
    var options = require('./settings.json');
} catch (e) {
    utils.log("Unable to load settings. Please copy 'settings-example.json' to 'settings.json' and configure.");
    process.exit();
}

fs.exists(path.join(__dirname, "temp"), (exists) => {
    if (!exists) fs.mkdir(path.join(__dirname, "temp"));
});

var mongo = require('./lib/mongo_client.js')(utils, options);
var discord = require('./lib/discord_client.js')(utils, options, path);
var twitter = require('./lib/twitter.js')(utils, options, discord, request, fs, path, mongo);
var messages = require('./lib/messages.js')(utils, options, discord, request, mongo, twitter, fs, path, moment);
