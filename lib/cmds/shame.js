'use strict';
const path = require('path');

exports.info = {
  name: 'shame',
  desc: 'Embeds a shameNun gif',
  usage: 'shame',
};

exports.run = (d, m) => {
  m.channel.sendFile(path.join(process.cwd(), '/assets/shame.gif'), 'shame.gif');
};
