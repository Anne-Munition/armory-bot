'use strict';
exports.info = {
  desc: 'Show latency with a \'Pong!\' message.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  const array = [
    msg.channel.send(params.join(' ')),
  ];
  if (msg.channel.permissionsFor(client.user).has('MANAGE_MESSAGES')) array.push(msg.delete());
  Promise.all(array).then(resolve).catch(reject);
});
