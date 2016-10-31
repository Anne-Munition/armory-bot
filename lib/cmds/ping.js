'use strict';
exports.info = {
  desc: 'Show the bot\'s web and Discord API\'s latencty with a \'Pong!\' message.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  // Send a message to Discord
  msg.channel.sendMessage('Ping?')
    .then(m => {
      // Once that message is confirmed to be received,
      // analyze the difference between it's time stamp and out original message
      // Then edit the message, showing the latency
      m.edit(`Pong! \`\`${m.createdTimestamp - msg.createdTimestamp}ms\`\``);
    });
  utils.finish(client, msg, exports.info.name);
};
