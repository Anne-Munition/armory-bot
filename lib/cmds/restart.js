'use strict';
exports.info = {
  desc: 'Restarts the Bot.',
  usage: '',
  aliases: [],
};

const config = require('../../config');

// Force quits the app. Need to have a method in place to auto start the script on crash
exports.run = function Restart(client, msg) {
  return new Promise(resolve => {
    // Only works for the bot owner
    if (msg.author.id === config.owner_id) {
      msg.channel.sendMessage(':ok_hand:')
        .then(() => {
          process.exit(0);
          resolve();
        });
    }
  });
};
