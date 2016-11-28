'use strict';
exports.info = {
  desc: 'Print out a list of role to role ids.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  // Send a message to Discord
  utils.time(msg, 'cpu');
  const array = msg.guild.roles.array()
    .sort((a, b) => b.position - a.position)
    .map(r => `\`\`${r.position}.\`\` **${r.name}**: ${r.id}`);
  msg.channel.sendMessage(array.join('\n'));
  utils.finish(msg, exports.name);
};
