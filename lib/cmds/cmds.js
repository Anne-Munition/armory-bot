'use strict';
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  const arr = [msg.author.send(client.commands.map(c => `${c.name}: ${c.info.desc}`).sort().join('\n'),
    { code: 'apache' })];
  if (msg.channel.type === 'text') arr.push(msg.reply('I just sent you a DM with a list of commands.'));
  Promise.all(arr).then(resolve).catch(reject);
});
