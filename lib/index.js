'use strict';
const fs = require('fs'), //File system module
    path = require('path'), //File Path module
    jsonfile = require('jsonfile'),
    utils = require('./utilities.js')(); //Our utilities module. Contains general functions

module.exports = function (options) {

    utils.log("Starting Armory Bot...");

    fs.exists(path.join(__dirname, "temp"), (exists) => {
        if (!exists) fs.mkdir(path.join(__dirname, "temp")); //Create a temp folder if it does not exist
    });

    var mongo = require('./mongo_client.js')(options); //Our Mongo DB module
    var discord = require('./discord_client.js')(options, mongo); //Our Discord module
    var twitter = require('./twitter.js')(options, discord, mongo); //Our Twitter module
    var messages = require('./messages.js')(options, discord, mongo, twitter); //Our Discord Message Handler module
};
