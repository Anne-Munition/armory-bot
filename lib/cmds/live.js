'use strict';
exports.info = {
  desc: 'Posts who is currently live on Twitch.',
  usage: '',
  aliases: ['whatnow'],
};

exports.run = (client, msg, [num]) => new Promise((resolve, reject) => {
  if (msg.channel.type === 'dm') {
    client.utils.dmDenied(msg).then(resolve).catch(reject);
    return;
  }
  const users = msg.guild.members.filter(m => m.user.presence.game && m.user.presence.game.streaming)
  .map(m => {
	  const name = m.nickname || m.user.username;
	  return {name: name.toLowerCase(), string: `**${name}** - ${m.user.presence.game.name}`};
  });
  const sorted = users.sort((a, b) => {
	  if (a.name > b.name) return 1;
	  if (a.name < b.name) return -1;
	  return 0;
  }).map(x => x.string);
  let str = '```Now live on Twitch:```';
  msg.channel.sendMessage(`${str}${sorted.join('\n')}`).then(resolve).catch(reject);
});
