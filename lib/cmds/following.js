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

exports.run = (discord, msg, params = []) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    return;
  }
  params = params.map(p => p.toLowerCase());
  const user = params[0];
  const channel = params[1] ? params[1] : config.twitch.channel.toLowerCase();

  // TODO: This endpoint will be depreciated in Feb 2018
  const channelUri = `https://api.twitch.tv/kraken/users/${user}/follows/channels/` +
    `${channel}?client_id=${config.twitch.client_id}`;
  logger.debug(channelUri);
  utils.time(msg, 'cpu');
  utils.jsonRequest(channelUri)
    .then(body => {
      utils.time(msg, 'io');
      msg.channel.sendMessage(`**${user}** has been following **${channel}** since: \`\`${body.created_at}\`\`` +
        `\n${utils.formatTimeDiff(moment(body.created_at))}`);
      utils.finish(msg, exports.name);
    })
    .catch(err => {
      utils.time(msg, 'io');
      if (err) {
        logger.error(err);
      }
      if (err === 404) {
        msg.channel.sendMessage(`**${user}** does not follow **${channel}**`);
      }
      utils.finish(msg, exports.name);
    });
};
