'use strict';
exports.info = {
  desc: 'Posts Twitch following info for the user provided.',
  usage: '<user> [channel]',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  // Exit if only cmd was ran with no names
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  let user = params[0];
  let channel = params[1] ? params[1] : client.config.twitch.channel.toLowerCase();
  try {
    const result = await client.utils.requestJSON(`https://api.twitch.tv/kraken/users?login=${user},${channel}` +
      `&client_id=${client.config.twitch.client_id}&api_version=5`);
    if (!result.users.find(x => x.name === user.toLowerCase())) {
      msg.reply(`**${user}** is not a registered Twitch channel.`).then(resolve).catch(reject);
      return;
    } else if (!result.users.find(x => x.name === channel.toLowerCase())) {
      msg.reply(`**${channel}** is not a registered Twitch channel.`).then(resolve).catch(reject);
      return;
    } else {
      user = {
        name: client.utils.twitchDisplayName(result.users[0].name, result.users[0].display_name),
        id: result.users[0]._id,
      };
      channel = {
        name: client.utils.twitchDisplayName(result.users[1].name, result.users[1].display_name),
        id: result.users[1]._id,
      };
    }
  } catch (err) {
    reject(err);
    return;
  }

  const uri = `https://api.twitch.tv/kraken/users/${user.id}/follows/channels/` +
    `${channel.id}?client_id=${client.config.twitch.client_id}&api_version=5`;
  client.logger.debug(uri);
  client.utils.requestJSON(uri)
    .then(body => {
      msg.channel.send(`**${user.name}** has been following **${channel.name}** since: ` +
        `\`\`${body.created_at}\`\`\n${client.utils.formatTimeDiff(body.created_at)}`).then(resolve).catch(reject);
    })
    .catch(err => {
      if (err === 404) {
        msg.channel.send(`**${user.name}** does not follow **${channel.name}**`).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
});
