'use strict';
exports.info = {
  name: 'shame',
  desc: 'Embeds a shameNun gif',
  usage: 'shame',
};

const path = require('path');

exports.run = (discord, msg) => {
  msg.channel.sendFile(path.join(process.cwd(), '/assets/shame.gif'), 'shame.gif');
};
