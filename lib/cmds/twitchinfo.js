'use strict';
exports.info = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name|id>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

const request = require('snekfetch');

exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  const query = params.join(' ').trim().toLowerCase();
  const user = await client.twitch.getUserData(query);
  if (!user) {
    msg.channel.send(`The Twitch channel **${params[0]}** does not exist.`).then(resolve).catch(reject);
    return;
  }

  const uri = client.utils.buildUri('https://api.twitch.tv/helix/subscriptions', {
    user_id: user.id,
    broadcaster_id: client.config.twitch.id,
  });
  const subscription = client.utils.get(['body', 'data', 0],
      await request.get(uri)
          .set({
            'Client-ID': client.config.twitch.client_id,
            Authorization: `Bearer ${client.config.twitch.access_token}`,
          }));

  const name = client.twitch.displayName(user);
  const type = `\n${client.utils.capitalize(user.broadcaster_type)}`;
  const sub = `\nSubscribed: **${Boolean(subscription)}**`;
  let str = /^\d+$/.test(query) ? `${user.id} => **${name}**` : `${name} => **${user.id}**`;
  if (user.broadcaster_type) str += type;
  if (subscription) str += sub;
  msg.channel.send(str)
    .then(resolve).catch(reject);
});
