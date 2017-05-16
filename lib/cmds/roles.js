'use strict';
exports.info = {
  desc: 'Print out a list of role to role ids.',
  usage: '',
  aliases: [],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  const array = msg.guild.roles.array()
    .sort((a, b) => b.position - a.position)
    .map(r => `\`\`${r.position}.\`\` **${r.name}**: ${r.id}`);
  msg.channel.send(array.join('\n')).then(resolve).catch(reject);
});
