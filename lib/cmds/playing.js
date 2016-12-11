'use strict';
exports.info = {
  name: 'playing',
  desc: 'Posts a list of members playing the specified game.',
  usage: '<game>',
  aliases: [],
};

const logger = require('winston');

exports.run = (client, msg, params = []) => new Promise(resolve => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    logger.debug('No parameters passed to playing');
    msg.reply(`\`\`${msg.prefix}playing <game>\`\``);
    resolve();
    return;
  }
  const game = params.join(' ');
  const players = msg.guild.members
    .filter(m => m.user.presence.game && m.user.presence.game.name.toLowerCase().includes(game.toLowerCase()))
    .map(m => {
      return { name: m.user.username, modified: m.user.username.toLowerCase(), game: m.user.presence.game.name };
    })
    .sort((a, b) => {
      if (a.modified < b.modified) {
        return -1;
      }
      if (a.modified > b.modified) {
        return 1;
      }
      return 0;
    })
    .map(p => `**${p.name}** (${p.game})`);
  if (players.length === 0) {
    msg.channel.sendMessage(`Nobody is playing \`\`${game}\`\``);
  } else {
    msg.channel.sendMessage(`\`\`\`qml\n${players.length} playing ${game}:\`\`\`\n${players.join('\n')}`);
  }
  resolve();
});
