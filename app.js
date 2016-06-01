'use strict';
const fs = require('fs'), //File system module
    path = require('path'), //File Path module
    request = require('request'), //HTTP request module
    moment = require('moment'); //Date-Time module

var utils = require('./lib/utilities.js')(moment); //Our utilities module. Contains general functions
utils.log("Starting Armory Bot...");

try {
    var options = require('./settings.json'); //Load settings file
} catch (e) { //TODO: Maybe respond if the file is missing, or just has a parsing error
    utils.log("Unable to load settings. Please copy 'settings-example.json' to 'settings.json' and configure.");
    process.exit(); //Exit if the settings file cannot be loaded properly
}

fs.exists(path.join(__dirname, "temp"), (exists) => {
    if (!exists) fs.mkdir(path.join(__dirname, "temp")); //Create a temp folder if it does not exist
});

var mongo = require('./lib/mongo_client.js')(utils, options); //Our Mongo DB module
var discord = require('./lib/discord_client.js')(utils, options, path, mongo); //Our Discord module
var twitter = require('./lib/twitter.js')(utils, options, discord, request, fs, path, mongo); //Our Twitter module
var messages = require('./lib/messages.js')(utils, options, discord, request, mongo, twitter, fs, path, moment); //Our Discord Message Handler module
