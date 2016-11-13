'use strict';
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  msg.channel.sendCode('apache', client.commands.map(c => `${c.name}: ${c.info.desc}`).sort().join('\n'));
  utils.finish(msg, exports.name);
};

// TODO: Only show commands the user has perms for
