'use strict';
exports.info = {
  desc: 'Show latency with a \'Pong!\' message.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Send initial response message
  msg.channel.send('Ping...')
    .then(m => {
      // Compare the data about the message that triggered this command
      // and the initial response message
      // Edit the initial response message to show the createdTimestamp diff
      // between the messages mentioned
      m.edit(`Pong! \`\`${m.createdTimestamp - msg.createdTimestamp}ms\`\``)
        .then(resolve).catch(reject);
    }).catch(reject);
});
