'use strict';
exports.info = {
  name: 'ping',
  desc: 'Respond with \'Pong!\'',
  usage: 'ping',
  aliases: [],
};

exports.run = (client, msg) => {
  // Send a message to Discord
  msg.channel.sendMessage('Ping?')
    .then(m => {
      // Once that message is confirmed to be received,
      // analyze the difference between it's time stamp and out original message
      // Then edit the message, showing the latency
      m.edit(`Pong! \`\`${m.createdTimestamp - msg.createdTimestamp}ms\`\``);
    });
};
