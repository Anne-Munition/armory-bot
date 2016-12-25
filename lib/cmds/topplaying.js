'use strict';
exports.info = {
  desc: 'Posts the top 5 games being played by Discord Members.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => new Promise((resolve, reject) => {
  if (msg.channel.type === 'dm') {
    utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  const games = {};
  msg.guild.members.forEach(m => {
    if (m.user.presence.game) {
      const name = m.user.presence.game.name;
      if (games[name]) {
        games[name]++;
      } else {
        games[name] = 1;
      }
    }
  });
  const sortable = [];
  for (const game in games) {
    sortable.push([game, games[game]]);
  }
  sortable.sort((a, b) => b[1] - a[1]).slice(0, 5);
  let str = '```Top games currently being played:```';
  sortable.forEach(g => {
    str += `\n${g[1]} playing: **${g[0]}**`;
  });
  msg.channel.sendMessage(str).then(resolve).catch(reject);
});
