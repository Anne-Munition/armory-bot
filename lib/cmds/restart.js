'use strict';
exports.info = {
  name: 'restart',
  desc: 'Restarts the bot',
  usage: 'restart',
};

// Force quits the app. Need to have a method in place to auto start the script on crash
exports.run = (discord, msg) => {
  // Only works for DBKynd until perms are finished
  if (msg.author.id === '84770528526602240') {
    msg.channel.sendMessage(':ok_hand:')
      .then(() => {
        process.exit(0);
      });
  }
};
