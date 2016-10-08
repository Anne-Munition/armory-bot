'use strict';
const config = require('../config');
const logger = require('./logger')();
const fs = require('fs');
const path = require('path');
require('./perf');

logger.info('Starting ArmoryBot: PID:', process.pid);

// Create a temp folder if it does not exist
config.tempPath = path.join(__dirname, '../temp');
if (!fs.existsSync(config.tempPath)) {
  logger.debug('Creating temp directory');
  fs.mkdirSync(config.tempPath);
}

//const utils = require('./utilities');

/*var mongo = require('./mongo_client.js'), //Our Mongo DB module
 discord = require('./discord_client.js'), //Our Discord module
 twitter = require('./twitter.js'), //Our Twitter module
 messages = require('./messages.js'); //Our Discord Message Handler module



 mongo = mongo(options); //Our Mongo DB module
 discord = discord(options, mongo); //Our Discord module
 twitter = twitter(options, discord, mongo); //Our Twitter module
 messages = messages(options, discord, mongo, twitter); //Our Discord Message Handler module*/
