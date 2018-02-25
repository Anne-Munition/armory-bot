'use strict';
exports.info = {
  desc: '\'Pong!\'',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  msg.channel.send(':ping_pong:').then(resolve).catch(reject);
});
