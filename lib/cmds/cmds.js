'use strict';
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  const commands = client.commands
    .filter(x => !(x.info.hidden && msg.author.id !== client.config.owner_id && msg.author.id !== msg.guild.owner.id))
    .map(c => `${c.name}: ${c.info.desc}`);
  msg.member.send(commands.sort().join('\n'), { code: 'apache' })
    .then(() => {
      if (msg.channel.type === 'text') {
        msg.reply('I just sent you a DM with a list of commands.').then(resolve).catch(reject);
      }
    })
    .catch(() => msg.reply('Unable to send you a list of commands, Did you block me? :disappointed:'));
});
