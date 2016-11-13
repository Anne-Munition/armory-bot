'use strict';
exports.info = {
  name: 'playing',
  desc: 'Posts a list of members playing the specified game.',
  usage: '<game>',
  aliases: [],
};

const logger = require('winston');

exports.run = (client, msg, params = []) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    logger.debug('No parameters passed to playing');
    return;
  }
  const players = msg.guild.members
    .filter(m => m.user.presence.game && m.user.presence.game.name === params[0])
    .map(m => m.user.username)
    .sort();
  if (players.length === 0) {
    msg.channel.sendMessage(`Nobody is playing \`\`${params[0]}\`\``);
  } else {
    msg.channel.sendMessage(`\`\`\`qml\nPlaying ${params[0]}:\`\`\`\n${players.join('\n')}`);
  }
};
