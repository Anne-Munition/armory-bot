'use strict';
var app = require('./lib');

var options = {
    owner_id: "", //Your Discord ID, NOT the bot's ID
    bot_token: "", //The Bot's Discord access token
    bot_app_id: "", //The Bot's application ID
    commands: {
        prefix: "!", //Prefix to be used for all commands
        deny_blank_perms: false //Newly created commands will have deny permissions by default
    },
    twitter: { //Your Twitter app's credentials
        consumer_key: "",
        consumer_secret: "",
        access_token_key: "",
        access_token_secret: ""
    },
    mongodb_uri: "", //The mongoDB URI - mLab is a popular DB as a service providers with free tiers for low traffic applications and development
    battle_net_tag: "" //Your battle.net tag - This prevents the playoverwatch.com url from being show if it is a match (hide streamers battle.net id)
};

app = new app(options);
