'use strict';
exports.info = {
  desc: 'Restarts the Bot.',
  usage: '',
  aliases: [],
};

// Force quits the app. Need to have a method in place to auto start the script on crash
exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Do not respond in Music Channel
  if (msg.channel.id === '119944592832331776') return;
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
