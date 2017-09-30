'use strict';
exports.info = {
  desc: 'Posts Twitch following info for the user provided.',
  usage: '<user> [channel]',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

const request = require('snekfetch');

exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  // Exit if only cmd was ran with no names
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  const user = params[0];
  const channel = params[1] ? params[1] : client.config.twitch.channel.toLowerCase();
  const login = client.utils.get(['body', 'data'], await request
    .get(`https://api.twitch.tv/helix/users?login=${user}&login=${channel}`)
    .set({ 'Client-ID': client.config.twitch.client_id }));
  if (!login) {
    msg.reply('Twitch API Error');
    reject();
    return;
  }
  if (!login.find(x => x.login === user.toLowerCase())) {
    msg.reply(`**${user}** is not a registered Twitch channel.`).then(resolve).catch(reject);
    return;
  } else if (!login.find(x => x.login === channel.toLowerCase())) {
    msg.reply(`**${channel}** is not a registered Twitch channel.`).then(resolve).catch(reject);
    return;
  }
  const nameA = client.utils.twitchDisplayName(login[0]);
  const nameB = client.utils.twitchDisplayName(login[1]);
  const uri = client.utils.buildUri('https://api.twitch.tv/helix/users/follows', {
    from_id: login[0].id,
    to_id: login[1].id,
  });
  const following = client.utils.get(['body', 'data', 0],
    await request.get(uri).set({ 'Client-ID': client.config.twitch.client_id }));
  if (!following) {
    msg.channel.send(`**${nameA}** does not follow **${nameB}**`).then(resolve).catch(reject);
    return;
  }
  msg.channel.send(`**${nameA}** has been following **${nameB}** since: ` +
    `\`\`${following.followed_at}\`\`\n${client.utils.formatTimeDiff(following.followed_at)}`)
    .then(resolve).catch(reject);
});
