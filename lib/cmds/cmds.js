'use strict';
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  const commands = client.commands
    .filter(x => !(x.info.hidden && msg.author.id !== client.config.owner_id && msg.author.id !== msg.guild.owner.id))
    .map(c => `${c.name}: ${c.info.desc}`);
  const arr = [msg.author.send(commands.sort().join('\n'),
    { code: 'apache' })];
  if (msg.channel.type === 'text') arr.push(msg.reply('I just sent you a DM with a list of commands.'));
  Promise.all(arr).then(resolve).catch(reject);
});
