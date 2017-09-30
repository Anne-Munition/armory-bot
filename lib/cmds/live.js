'use strict';
exports.info = {
  desc: 'Posts who is currently live on Twitch.',
  usage: '',
  aliases: ['whatnow'],
  permissions: ['SEND_MESSAGES'],
};

const request = require('snekfetch');

exports.run = (client, msg) => new Promise(async (resolve, reject) => {
  let liveSubs;
  try {
    liveSubs = (await request.get('http://vps.annemunition.tv:3005/live_subs')).body;
  } catch (err) {
    msg.reply('Unable to get a valid response.');
    reject(err);
    return;
  }
  const arr = [];
  for (const key in liveSubs) {
    if (liveSubs.hasOwnProperty(key)) {
      arr.push(liveSubs[key]);
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
    .map(x => {
      const status = x.status.length > 30 ? `${x.status.slice(0, 30)}...` : x.status;
      return `**${x.display_name}**: __${x.game}__ - ${status}`;
    });
  msg.channel.send(strings.join('\n'), { split: 1800 }).then(resolve).catch(reject);
});
