'use strict';
exports.info = {
  desc: 'Restarts the Bot.',
  usage: '',
  aliases: [],
};

const config = require('../../config');
const utils = require('../utilities');

// Force quits the app. Need to have a method in place to auto start the script on crash
exports.run = (client, msg) => {
  // Only works for the bot owner
  if (msg.author.id === config.owner_id) {
    utils.time(msg, 'cpu');
    msg.channel.sendMessage(':ok_hand:')
      .then(() => {
        utils.time(msg, 'io');
        utils.finish(msg, exports.name);
        process.exit(1);
      });
  }
};
