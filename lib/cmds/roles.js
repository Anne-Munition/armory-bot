'use strict';
exports.info = {
  desc: 'Print out a list of role to role ids.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  // Send a message to Discord
  utils.time(msg, 'cpu');
  const array = msg.guild.roles.map(r => `${r.name}: ${r.id}`);
  msg.channel.sendCode('json', array);
  utils.finish(msg, exports.name);
};
