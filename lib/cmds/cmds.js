'use strict';
exports.info = {
  desc: 'Shows list and description of available commands. (this)',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  msg.channel.sendCode('apache', client.commands.map(c => `${c.name}: ${c.info.desc}`).sort().join('\n'));
  utils.finish(client, msg, exports.name);
};
