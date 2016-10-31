'use strict';
exports.info = {
  name: 'restart',
  desc: 'Restarts the bot',
  usage: 'restart',
  aliases: [],
};

// Force quits the app. Need to have a method in place to auto start the script on crash
exports.run = (client, msg) => {
  // Only works for the bot owner
  if (msg.author.id === client.config.owner_id) {
    msg.channel.sendMessage(':ok_hand:')
      .then(() => {
        process.exit(1);
      });
  }
};
