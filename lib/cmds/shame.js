'use strict';
exports.info = {
  name: 'shame',
  desc: 'Embeds a shameNun gif',
  usage: 'shame',
  aliases: [],
};

const path = require('path');
const utils = require('../utilities');

exports.run = (client, msg) => {
  // Send the shame gif from our assets directory to the channel where the command was ran
  msg.channel.sendFile(path.join(process.cwd(), '/assets/shame.gif'), 'shame.gif');
  utils.finish(client, msg, exports.info.name);
};
