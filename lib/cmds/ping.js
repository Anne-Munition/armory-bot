'use strict';
exports.info = {
  name: 'ping',
  desc: 'Respond with \'Pong!\'',
  usage: 'ping',
  aliases: [],
};

exports.run = (client, msg) => {
  msg.channel.sendMessage('Ping?')
    .then(m => {
      m.edit(`Pong! \`\`${m.createdTimestamp - msg.createdTimestamp}ms\`\``);
    });
};
