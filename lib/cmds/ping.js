'use strict';
exports.info = {
  name: 'ping',
  desc: 'Respond with \'Pong!\'',
  usage: 'ping',
};

exports.run = (d, m) => {
  m.channel.sendMessage('Ping?')
    .then(msg => {
      msg.edit(`Pong! \`\`${msg.createdTimestamp - m.createdTimestamp}ms\`\``);
    });
};
