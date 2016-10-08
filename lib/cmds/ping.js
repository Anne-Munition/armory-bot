'use strict';
exports.info = {
  name: 'ping',
  desc: 'Respond with \'Pong!\'',
  usage: 'ping',
};

exports.run = (d, m) => {
  m.reply('PONG!');
};
