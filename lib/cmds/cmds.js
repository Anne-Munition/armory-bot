'use strict';
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
};

exports.run = function Cmds(client, msg) {
  return new Promise((resolve) => {
    msg.channel.sendCode('apache', client.commands.map(c => `${c.name}: ${c.info.desc}`).sort().join('\n'));
    resolve();
  });
};
