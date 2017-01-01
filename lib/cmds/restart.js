'use strict';
exports.info = {
  desc: 'Restarts the Bot.',
  usage: '',
  aliases: [],
};

// Force quits the app. Need to have a method in place to auto start the script on crash
exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Only works for the bot owner
  if (msg.author.id !== client.config.owner_id) {
    msg.reply('Only the bot owner has permission to run this command.').then(resolve).catch(reject);
    return;
  }
  msg.channel.sendMessage(':ok_hand:')
    .then(() => {
      process.exit(0);
      // Doesn't ever actually resolve
      resolve();
    }).catch(reject);
});
