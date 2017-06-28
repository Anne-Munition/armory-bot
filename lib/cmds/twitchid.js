'use strict';
exports.info = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name>',
  aliases: [],
};

exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  try {
    let uri = `https://api.twitch.tv/kraken/users?login=${params.join(' ')}&api_version=5` +
      `&client_id=${client.config.twitch.client_id}`;
    client.logger.debug(uri);
    const twitchIdResponse = await client.utils.requestJSON(uri);
    if (twitchIdResponse._total === 0) {
      msg.channel.send(`The Twitch channel **${params[0]}** does not exist.`).then(resolve).catch(reject);
      return;
    }
    const user = twitchIdResponse.users[0];
    const name = client.utils.twitchDisplayName(user.name, user.display_name);
    const id = user._id;
    uri = `https://api.twitch.tv/kraken/channels/${id}?api_version=5` +
      `&client_id=${client.config.twitch.client_id}`;
    client.logger.debug(uri);
    const twitchUserResponse = await client.utils.requestJSON(uri);
    const type = `\n${twitchUserResponse.broadcaster_type}`;
    msg.channel.send(`${name} => **${id}**${client.utils.capitalize(type)}`)
      .then(resolve).catch(reject);
  } catch (e) {
    reject(e);
  }
});
