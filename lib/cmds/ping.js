'use strict';
exports.info = {
  desc: 'Show latency with a \'Pong!\' message.',
  usage: '',
  aliases: [],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  msg.channel.sendMessage('Ping?')
    .then(m => {
      m.edit(`Pong! \`\`${m.createdTimestamp - msg.createdTimestamp}ms\`\``)
        .then(resolve).catch(reject);
    }).catch(reject);
});
