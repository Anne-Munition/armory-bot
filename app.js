'use strict';
const fs = require('fs'), //File system module
    path = require('path'), //File Path module
    jsonfile = require('jsonfile');

var utils = require('./lib/utilities.js')(); //Our utilities module. Contains general functions
var queueList;
jsonfile.spaces = 2;
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

let queueList_path = path.join(__dirname, "assets/queue.json");
if (!fs.existsSync(queueList_path)) {
    jsonfile.writeFileSync(queueList_path, []);
}
queueList = require(queueList_path);

var mongo = require('./lib/mongo_client.js')(utils, options); //Our Mongo DB module
var discord = require('./lib/discord_client.js')(utils, options, mongo); //Our Discord module
var twitter = require('./lib/twitter.js')(utils, options, discord, mongo); //Our Twitter module
var messages = require('./lib/messages.js')(utils, options, discord, mongo, twitter, queueList); //Our Discord Message Handler module
