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
  // Set to false to not receive command error messages via DM
  receiveErrors: true,
  // The mongoDB URI for database storage
  mongodb_uri: 'mongodb://',
  // Twitch credentials - https://www.twitch.tv/settings/connections
  twitch: {
    channel: '',
    id: '',
    client_id: '',
  },
  // Nodecraft credentials for showing MC server statistics https://nodecraft.com/account/edit
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
  // Twitter credentials https://apps.twitter.com/
  twitter: {
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: '',
  },
  // Spotify credentials https://developer.spotify.com/my-applications/#!/applications
  spotify: {
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    max_count: 3,
  },
  // LastFM credentials http://www.last.fm/api/account/create
  lastFM: {
    username: '',
    key: '',
    secret: '',
  },
};
