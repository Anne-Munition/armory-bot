'use strict';
exports.info = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

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
  const name = client.twitch.displayName(user);
  const type = `\n${user.broadcaster_type}`;
  const str = /^\d+$/.test(query) ?
    `${user.id} => **${name}**${client.utils.capitalize(type)}` :
    `${name} => **${user.id}**${client.utils.capitalize(type)}`;
  msg.channel.send(str)
    .then(resolve).catch(reject);
});
