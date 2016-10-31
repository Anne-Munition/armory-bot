'use strict';
exports.info = {
  name: 'cmds',
  desc: 'Shows list of available commands <this>',
  usage: 'cmds',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  msg.channel.sendCode('', client.commands.map(c => c.info.name).sort().join(' | '));
  utils.finish(client, msg, exports.info.name);
};
