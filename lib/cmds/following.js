'use strict';
exports.info = {
  desc: 'Posts Twitch following info for the user provided.',
  usage: '<user> [channel]',
  aliases: [],
};

exports.run = (client, msg, params = []) => new Promise(async(resolve, reject) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  params = params.map(p => p.toLowerCase());
  let user = params[0];
  let channel = params[1] ? params[1] : client.config.twitch.channel.toLowerCase();

  try {
    // todo: redo when they allow bulk searching for ids in v5
    const results = await Promise.all([
      client.utils.requestJSON(`https://api.twitch.tv/kraken/users?login=${user}&api_version=5` +
        `&client_id=${client.config.twitch.client_id}`),
      client.utils.requestJSON(`https://api.twitch.tv/kraken/users?login=${channel}&api_version=5` +
        `&client_id=${client.config.twitch.client_id}`),
    ]);
    if (results[0]._total === 0) {
      msg.reply(`**${params[0]}** is not a Twitch channel.`).then(resolve).catch(reject);
      return;
    } else if (results[1]._total === 0) {
      msg.reply(`**${params[1]}** is not a Twitch channel.`).then(resolve).catch(reject);
      return;
    } else {
      user = {
        name: client.utils.twitchDisplayName(results[0].users[0].name, results[0].users[0].display_name),
        id: results[0].users[0]._id,
      };
      channel = {
        name: client.utils.twitchDisplayName(results[1].users[0].name, results[1].users[0].display_name),
        id: results[1].users[0]._id,
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
      msg.channel.sendMessage(`**${user.name}** has been following **${channel.name}** since: ` +
        `\`\`${body.created_at}\`\`\n${client.utils.formatTimeDiff(body.created_at)}`).then(resolve).catch(reject);
    })
    .catch(err => {
      if (err === 404) {
        msg.channel.sendMessage(`**${user.name}** does not follow **${channel.name}**`).then(resolve).catch(reject);
        return;
      }
      reject(err);
    });
});
