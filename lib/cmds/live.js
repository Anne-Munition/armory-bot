'use strict';
exports.info = {
  desc: 'Posts who is currently live on Twitch.',
  usage: '',
  aliases: ['whatnow'],
  permissions: ['SEND_MESSAGES'],
};

const request = require('snekfetch');
const twitch = require('../twitch')();

exports.run = (client, msg) => new Promise(async (resolve, reject) => {
  // Get the live sub info from Anne's vps
  const liveSubs = client.utils.get(['body'], await request.get('https://info.annemunition.tv/getLiveSubs'));
  // Error if we don't get any valid data
  if (!liveSubs) {
    msg.reply('Unable to get a valid response.').then(resolve).catch(reject);
    return;
  }
  // Format the results into an array format for sorting and such
  const strings = liveSubs
    // Sort by display_name
    .sort((a, b) => {
      const c = twitch.displayName(a.user).toLowerCase();
      const d = twitch.displayName(b.user).toLowerCase();
      if (c < d) return -1;
      if (d < c) return 1;
      return 0;
    })
    .map(x => {
      const status = x.title.length > 30 ? `${x.title.slice(0, 30)}...` : x.title;
      return `**${twitch.displayName(x.user)}**: __${x.game.name}__ - ${status}`;
    });
  msg.channel.send(`**${strings.length}** of Anne's subscribers are currently live.\n` +
    `<http://annemunition.tv/armory>\n\n${strings.join('\n')}`, { split: true })
    .then(resolve).catch(reject);
});
