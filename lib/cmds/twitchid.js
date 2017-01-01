'use strict';
exports.info = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name>',
  aliases: [],
};

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  const uri = `https://api.twitch.tv/kraken/users?login=${params.join(' ')}&api_version=5` +
    `&client_id=${client.config.twitch.client_id}`;
  client.logger.debug(uri);
  client.utils.requestJSON(uri)
    .then(body => {
      if (body._total > 0) {
        const name = client.utils.twitchDisplayName(body.users[0].name, body.users[0].display_name);
        msg.channel.sendMessage(`${name} => **${body.users[0]._id}**`).then(resolve).catch(reject);
      } else {
        msg.channel.sendMessage(`The Twitch channel **${params[0]}** does not exist.`).then(resolve).catch(reject);
      }
    }).catch(reject);
});
