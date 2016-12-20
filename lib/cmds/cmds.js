'use strict';
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  msg.channel.sendCode('apache', client.commands.map(c => `${c.name}: ${c.info.desc}`).sort().join('\n'))
    .then(resolve).catch(reject);
});
