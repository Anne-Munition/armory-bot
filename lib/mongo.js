'use strict';
const logger = require('winston');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

module.exports = (client) => {
  const uri = client.config.mongodb_uri || '';
  logger.debug('Checking if mongoURI is valid');
  const mongoURI = new RegExp('^(mongodb:(?:\\/{2})?)((\\w+?):(\\w+?)@|:?@?)(.*?):?(\\d+?)?\\/(.+?)\\/?$');
  if (!mongoURI.test(uri)) {
    return logger.error('The provided mongoURI is not valid');
  } else {
    logger.debug('Valid mongoURI');
    const dbName = uri.match(mongoURI)[7];
    logger.debug(`Attempting to connect to the mongoDB: '${dbName}'...`);

    mongoose.connect(uri, {
      useMongoClient: true,
      keepAlive: 1,
      connectTimeoutMS: 30000,
    }, err => {
      if (err) {
        logger.error(`Unable to connect to the mongoDB: '${dbName}'`, err);
      } else {
        logger.info(`Connected to the mongoDB: '${dbName}'`);
      }
    });
  }

  mongoose.connection.on('connected', () => {
    loadGuildConfigs();
    loadCommandPerms();
  });

  mongoose.connection.on('error', err => {
    logger.error('Mongoose connection error:', err ? err.stack : '');
    client.utils.ownerError('Mongoose Error', client, err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose connection disconnected');
    client.utils.ownerError('Mongoose Disconnected', client);
  });

  const welcomeChannels = mongoose.model('welcome_channels', {
    server_id: String,
    channel_id: String,
  }, 'welcome_channels');

  const auditChannels = mongoose.model('audit_channels', {
    server_id: String,
    channel_id: String,
  }, 'audit_channels');

  const guildConfigs = mongoose.model('guild_configs', {
    server_id: String,
    config: Object,
  }, 'guild_configs');

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

  const twitchChannels = mongoose.model('twitch_channels', {
    channels: Array,
    display_name: String,
    image_url: String,
    login: String,
    twitch_id: String,
  }, 'twitch_channels');

  async function loadGuildConfigs() {
    logger.debug('Loading guildConfigs from mongo');
    const results = await guildConfigs.find({});
    client.guildConfigs.clear();
    results.forEach(r => {
      client.guildConfigs.set(r.server_id, r.config);
    });
    logger.info(`Loaded ${client.guildConfigs.size} guild configs`);
  }

  async function loadCommandPerms() {
    logger.debug('Loading commandPerms from mongo');
    const results = await perms.find({});
    client.commandPerms.clear();
    results.forEach(r => {
      client.commandPerms.set(`${r.server_id}-${r.cmd}`, r.perms);
    });
    logger.info(`Loaded ${client.commandPerms.size} command perms configs`);
  }

  return {
    welcomeChannels,
    auditChannels,
    guildConfigs,
    perms,
    twitchChannels,
  };
};
