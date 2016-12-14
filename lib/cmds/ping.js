'use strict';
exports.info = {
  desc: 'Show latency with a \'Pong!\' message.',
  usage: '',
  aliases: [],
};

exports.run = (client, msg) => new Promise(resolve => {
  msg.channel.sendMessage('Ping?')
    .then(m => {
      m.edit(`Pong! \`\`${m.createdTimestamp - msg.createdTimestamp}ms\`\``);
      return resolve();
    });
});
