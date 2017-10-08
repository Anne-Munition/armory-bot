'use strict';
exports.info = {
  desc: 'Posts the top 5 games being played by Discord Members.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg, [num]) => new Promise((resolve, reject) => {
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  const games = {};
  msg.guild.members.forEach(m => {
    if (m.user.presence.activity && m.user.presence.activity.type === 'PLAYING') {
      const name = m.user.presence.activity.name;
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
  sortable.sort((a, b) => b[1] - a[1]);
  const none = sortable.length === 0 ? ' NONE' : '';
  let str = `\`\`\`Top games currently being played:${none}\`\`\``;
  sortable.slice(0, num || 5).forEach(g => {
    str += `\n${g[1]} playing: **${g[0]}**`;
  });
  msg.channel.send(str).then(resolve).catch(reject);
});
