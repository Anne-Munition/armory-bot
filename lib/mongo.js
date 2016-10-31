'use strict';
const config = require('../config');
const logger = require('winston');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

module.exports = function Mongo(client) {
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

  mongoose.connection.on('connected', () => {
    // Load all the guild configs into memory for speed
    logger.debug('Getting guild configs from mongoDB');
    guildConfigs.find({})
      .then(guilds => {
        logger.debug(`Got (${guilds.length}) guild configs`);
        guilds.forEach(guild => {
          client.guildConfigs.set(guild.server_id, guild.config);
        });
      })
      .catch(err => {
        logger.error('Error getting guild configs from mongoDB', err);
      });
    perms.find({})
      .then(perms => {
        logger.debug(`Got (${perms.length}) command perms`);
        perms.forEach(perm => {
          client.commandPermissions.set(`${perm.server_id}_${perm.cmd}`, perm.perms);
        });
      })
      .catch(err => {
        logger.error('Error getting command perms from mongoDB', err);
      });
  });

  mongoose.connection.on('error', err => {
    logger.error('Mongoose connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose connection disconnected');
  });

  const guildConfigs = mongoose.model('guild_configs', {
    server_id: String,
    config: Object,
  }, 'guild_configs');

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
    guildConfigs,
    twitterChannels,
    tweetMessages,
    welcomeChannels,
    gameQueues,
    perms,
  };
};
