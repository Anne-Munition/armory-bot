'use strict';
exports.info = {
  name: 'ping',
  desc: 'Respond with \'Pong!\'',
  usage: 'ping',
};

exports.run = (discord, msg) => {
  msg.channel.sendMessage('Ping?')
    .then(m => {
      m.edit(`Pong! \`\`${parseInt(m.createdTimestamp - msg.createdTimestamp)}ms\`\``);
    });
};
