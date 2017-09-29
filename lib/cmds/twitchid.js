'use strict';
exports.info = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

const qs = require('querystring');

exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  try {
    const uri = `https://api.twitch.tv/helix/users?${qs.stringify({
      login: params.join(' '),
    })}`;
    client.logger.debug(uri);
    const twitchIdResponse = await client.utils.requestJSON(uri, { 'Client-ID': client.config.twitch.client_id });
    if (twitchIdResponse.data.length === 0) {
      msg.channel.send(`The Twitch channel **${params[0]}** does not exist.`).then(resolve).catch(reject);
      return;
    }
    const user = twitchIdResponse.data[0];
    console.log(user);
    const name = client.utils.twitchDisplayName(user.login, user.display_name);
    const type = `\n${user.broadcaster_type}`;
    msg.channel.send(`${name} => **${user.id}**${client.utils.capitalize(type)}`)
      .then(resolve).catch(reject);
  } catch (e) {
    reject(e);
  }
});
