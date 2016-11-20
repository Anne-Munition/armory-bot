'use strict';
module.exports = {
  // The Bot's Discord access token
  bot_token: '',
  // The Bot's application ID
  bot_app_id: '',
  // Your user ID as the owner of this bot
  owner_id: '',
  // Prefix to be used for all commands
  prefix: '!',
  // The mongoDB URI for database storage
  mongodb_uri: '',
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
    channel: '',
    id: 0,
    client_id: '',
  },
  // Your Twitter app's credentials
  twitter: {
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: '',
  },
};
