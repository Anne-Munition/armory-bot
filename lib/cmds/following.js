'use strict';
exports.info = {
  name: 'following',
  desc: 'Posts Twitch following info for the user provided.',
  usage: '<user> [channel]',
};

const config = require('../../config');
const utils = require('../utilities');
const logger = require('winston');
const moment = require('moment');

exports.run = (discord, msg, params = []) => new Promise(async(resolve, reject) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    resolve();
    return;
  }
  params = params.map(p => p.toLowerCase());
  const user = params[0];
  const channel = params[1] ? params[1] : config.twitch.channel.toLowerCase();

  // TODO redo when they allow bulk searching for ids
  let userID;
  let channelID;
  try {
    userID = (await utils.requestJSON(`https://api.twitch.tv/kraken/users?login=${user}&api_version=5` +
      `&client_id=${config.twitch.client_id}`)).users[0]._id;
    channelID = (await utils.requestJSON(`https://api.twitch.tv/kraken/users?login=${channel}&api_version=5` +
      `&client_id=${config.twitch.client_id}`)).users[0]._id;
  } catch (err) {
    reject(err);
    return;
  }

  const uri = `https://api.twitch.tv/kraken/users/${userID}/follows/channels/` +
    `${channelID}?client_id=${config.twitch.client_id}&api_version=5`;
  logger.debug(uri);
  utils.requestJSON(uri)
    .then(body => {
      msg.channel.sendMessage(`**${user}** has been following **${channel}** since: \`\`${body.created_at}\`\`` +
        `\n${utils.formatTimeDiff(moment(body.created_at))}`);
      resolve();
    })
    .catch(err => {
      if (err) {
        logger.error(err);
      }
      if (err === 404) {
        msg.channel.sendMessage(`**${user}** does not follow **${channel}**`);
        resolve();
        return;
      }
      reject(err);
    });
});
