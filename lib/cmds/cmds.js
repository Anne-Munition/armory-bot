'use strict';
exports.info = {
  name: 'cmds',
  desc: 'Shows list of available commands <this>',
  usage: 'cmds',
};

exports.run = (discord, msg) => {
  // TODO: Only list what commands that person is allowed to run on a user level
  msg.channel.sendCode('', discord.cmds.map(c => c.info.name).sort().join(' | '));
};
