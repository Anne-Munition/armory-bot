'use strict';
const config = require('../config');
const logger = require('winston');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

module.exports = function Mongo() {
  logger.debug('Loading Mongo Module');
  const uri = config.mongodb_uri || '';
  logger.debug('Checking if mongoURI is valid');
  const mongoURI = new RegExp('^(mongodb:(?:\\/{2})?)((\\w+?):(\\w+?)@|:?@?)(.*?):?(\\d+?)?\\/(.+?)\\/?$');
  if (!mongoURI.test(uri)) {
    return logger.error('The provided mongoURI is not valid');
  }
  logger.debug('Valid mongoURI');

  const db = uri.match(mongoURI)[7];
  logger.debug(`Attempting to connect to the mongoDB: '${db}'...`);
  mongoose.connect(uri, err => {
    if (err) {
      logger.error(`Unable to connect to the mongoDB: '${db}'`, err);
    } else {
      logger.info(`Connected to the mongoDB: '${db}'`);
    }
  });

  const twitterChannels = mongoose.model('twitter_channels', {
    server_id: String,
    channel_id: String,
  }, 'twitter_channels');

  const tweetMessages = mongoose.model('twitter_messages', {
    tweet_id: String,
    messages: Array,
  }, 'twitter_messages');

  const welcomeChannels = mongoose.model('welcome_channels', {
    server_id: String,
    channel_id: String,
  }, 'welcome_channels');

  const gameQueues = mongoose.model('game_queues', {
    game: String,
    members: [{
      member_id: String,
      tag: String,
    }],
  }, 'game_queues');

  const perms = mongoose.model('cmd_perms', {
    server_id: String,
    cmd: String,
    perms: {
      allow: {
        members: Array,
        channels: Array,
        roles: Array,
      },
      deny: {
        members: Array,
        channels: Array,
        roles: Array,
      },
    },
  }, 'cmd_perms');

  return {
    twitterChannels,
    tweetMessages,
    welcomeChannels,
    gameQueues,
    perms,
  };
};
