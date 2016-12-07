'use strict';
const config = require('../config');
const logger = require('winston');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

const uri = config.mongodb_uri || '';
logger.debug('Checking if mongoURI is valid');
const mongoURI = new RegExp('^(mongodb:(?:\\/{2})?)((\\w+?):(\\w+?)@|:?@?)(.*?):?(\\d+?)?\\/(.+?)\\/?$');
if (!mongoURI.test(uri)) {
  logger.error('The provided mongoURI is not valid');
} else {
  logger.debug('Valid mongoURI');
  const dbName = uri.match(mongoURI)[7];
  logger.debug(`Attempting to connect to the mongoDB: '${dbName}'...`);

  mongoose.connect(uri, err => {
    if (err) {
      logger.error(`Unable to connect to the mongoDB: '${dbName}'`, err);
    } else {
      logger.info(`Connected to the mongoDB: '${dbName}'`);
    }
  });
}

mongoose.connection.on('error', err => {
  logger.error('Mongoose connection error:', err ? err.stack : '');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose connection disconnected');
});

const welcomeChannels = mongoose.model('welcome_channels', {
  server_id: String,
  channel_id: String,
}, 'welcome_channels');

const guildConfigs = mongoose.model('guild_configs', {
  server_id: String,
  config: Object,
}, 'guild_configs');

module.exports = {
  welcomeChannels,
  guildConfigs,
};
