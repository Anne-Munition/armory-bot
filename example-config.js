'use strict';
module.exports = {
  // The Bot's Discord access token
  bot_token: '',
  // The Bot's application ID
  bot_app_id: '',
  commands: {
    // Prefix to be used for all commands
    prefix: '!',
    // Newly created commands will have deny permissions by default
    deny_blank_perms: false,
  },
  // Your Twitter app's credentials
  twitter: {
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: '',
    // 0 = don't change; 1 = alter to original url; 2 = append base url to tco link in brackets
    resolve_tco_links: 2,
  },
  // The mongoDB URI for database storage
  mongodb_uri: '',
  // This tag is hidden from searches for privacy
  battle_net_tag: '',
  // Nodecraft credentials for showing MC server statistics
  nodecraft: {
    username: '',
    api_key: '',
    server_id: '',
  },
  twitch: {
    client_id: '',
  },
};
