'use strict';
const logger = require('./logger')();

logger.info('Starting ArmoryBot: PID:', process.pid);
//const fs = require('fs');
//const path = require('path');
//const utils = require('./utilities');

/*var mongo = require('./mongo_client.js'), //Our Mongo DB module
  discord = require('./discord_client.js'), //Our Discord module
  twitter = require('./twitter.js'), //Our Twitter module
  messages = require('./messages.js'); //Our Discord Message Handler module


utils.log("Starting Armory Bot...");

fs.exists(path.join(__dirname, "../temp"), (exists) => {
  if (!exists) fs.mkdir(path.join(__dirname, "../temp")); //Create a temp folder if it does not exist
});

mongo = mongo(options); //Our Mongo DB module
discord = discord(options, mongo); //Our Discord module
twitter = twitter(options, discord, mongo); //Our Twitter module
messages = messages(options, discord, mongo, twitter); //Our Discord Message Handler module*/
