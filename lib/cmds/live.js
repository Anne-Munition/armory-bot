'use strict';
exports.info = {
  desc: 'Posts who is currently live on Twitch.',
  usage: '',
  aliases: ['whatnow'],
};

exports.run = (client, msg) => new Promise(async (resolve, reject) => {
  // Only allowed in The Armory Server or test server
  if (msg.guild.id !== '84764735832068096' && msg.guild.id !== '140025699867164673') return;
  client.utils.requestJSON('http://vps.annemunition.tv:3005/live_subs')
    .then(result => {
      const arr = [];
      for (const key in result) {
        if (result.hasOwnProperty(key)) {
          arr.push(result[key]);
        }
      }
      const strings = arr
        .filter(x => x.viewers > 0)
        .sort((a, b) => {
          const c = a.display_name.toLowerCase();
          const d = b.display_name.toLowerCase();
          if (c < d) return -1;
          if (d < c) return 1;
          return 0;
        })
        .map(x => `**${x.display_name}**: __${x.game}__ - ${x.status.slice(0, 30)}`);
      msg.channel.send(strings.join('\n'), { split: 1800 }).then(resolve).catch(reject);
    })
    .catch(() => {
      msg.reply('Unable to get a valid response.').then(resolve).catch(reject);
    });
});
