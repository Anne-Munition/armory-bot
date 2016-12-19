'use strict';
exports.info = {
  desc: 'Print out a list of role to role ids.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => new Promise(resolve => {
  if (msg.channel.type === 'dm') {
    utils.dmDenied(msg);
    return resolve();
  }
  const array = msg.guild.roles.array()
    .sort((a, b) => b.position - a.position)
    .map(r => `\`\`${r.position}.\`\` **${r.name}**: ${r.id}`);
  msg.channel.sendMessage(array.join('\n'));
  return resolve();
});
