'use strict';
module.exports = {
  // The Bot's Discord access token
  bot_token: '00000000000000000',
  // The Bot's application ID
  bot_app_id: '00000000000000000.000000000000000000',
  // Your user ID as the owner of this bot
  owner_id: '00000000000000000',
  // Prefix to be used for all commands
  prefix: '!',
  // The mongoDB URI for database storage
  mongodb_uri: 'mongodb://',
  // Nodecraft credentials for showing MC server statistics
  nodecraft: {
    username: '',
    api_key: '',
    server_id: '',
  },
  // ow command to lookup Overwatch statistics
  overwatch: {
    // The default tag to lookup if none is passed
    default_battle_tag: '',
    // ID's to not link the play overwatch url
    hide_battle_tags: [],
  },
  // Twitch credentials
  twitch: {
    enabled: true,
    channel: '',
    id: '',
    client_id: '',
  },
  // Twitter credentials
  twitter: {
    enabled: true,
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: '',
  },
  spotify: {
    enabled: true,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    max_count: 3,
  },
  lastFM: {
    username: '',
    key: '',
    secret: '',
  },
};
