'use strict';
exports.info = {
  desc: 'Posts Twitch following info for the user provided.',
  usage: '<user> [channel]',
  aliases: [],
};

const config = require('../../config');
const utils = require('../utilities');
const logger = require('winston');

exports.run = (discord, msg, params = []) => new Promise(async(resolve, reject) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    utils.usage(msg, exports.info);
    return resolve();
  }
  params = params.map(p => p.toLowerCase());
  let user = params[0];
  let channel = params[1] ? params[1] : config.twitch.channel.toLowerCase();


  // TODO: redo when they allow bulk searching for ids in v5
  const promiseArray = [
    utils.requestJSON(`https://api.twitch.tv/kraken/users?login=${user}&api_version=5` +
      `&client_id=${config.twitch.client_id}`),
    utils.requestJSON(`https://api.twitch.tv/kraken/users?login=${channel}&api_version=5` +
      `&client_id=${config.twitch.client_id}`),
  ];

  try {
    const results = await Promise.all(promiseArray);
    if (results[0]._total === 0) {
      msg.reply(`**${params[0]}** is not a Twitch channel.`);
      return resolve();
    } else if (results[1]._total === 0) {
      msg.reply(`**${params[1]}** is not a Twitch channel.`);
      return resolve();
    } else {
      user = {
        name: utils.twitchDisplayName(results[0].users[0].name, results[0].users[0].display_name),
        id: results[0].users[0]._id,
      };
      channel = {
        name: utils.twitchDisplayName(results[1].users[0].name, results[1].users[0].display_name),
        id: results[1].users[0]._id,
      };
    }
  } catch (err) {
    return reject(err);
  }

  const uri = `https://api.twitch.tv/kraken/users/${user.id}/follows/channels/` +
    `${channel.id}?client_id=${config.twitch.client_id}&api_version=5`;
  logger.debug(uri);
  utils.requestJSON(uri)
    .then(body => {
      msg.channel.sendMessage(`**${user.name}** has been following **${channel.name}** since: ` +
        `\`\`${body.created_at}\`\`\n${utils.formatTimeDiff(body.created_at)}`);
      return resolve();
    })
    .catch(err => {
      if (err === 404) {
        msg.channel.sendMessage(`**${user.name}** does not follow **${channel.name}**`);
        return resolve();
      }
      if (err) {
        logger.error(err);
      }
      return reject(err);
    });
  return null;
});
