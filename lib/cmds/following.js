'use strict';
exports.info = {
  name: 'following',
  desc: 'Posts Twitch following info for the user provided.',
  usage: '<user> [channel]',
};

const config = require('../../config');
const utils = require('../utilities');
const logger = require('winston');
const request = require('request');
const moment = require('moment');

exports.run = (discord, msg, params = []) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    return;
  }
  params = params.map(p => p.toLowerCase());
  const user = params[0];
  const channel = params[1] ? params[1] : config.twitch.channel.toLowerCase();

  const channelUri = `https://api.twitch.tv/kraken/users/${user}/follows/channels/` +
    `${channel}?client_id=${config.twitch.client_id}`;
  logger.debug(channelUri);
  utils.time(msg, 'cpu');
  request.get({
    url: encodeURI(channelUri),
    json: true,
  }, (err, res, body) => {
    utils.time(msg, 'io');
    if (err || res.statusCode !== 200) {
      msg.channel.sendMessage(`**${user}** does not follow **${channel}**`);
      utils.finish(msg, exports.name);
    } else {
      const d = moment.duration(moment() - moment(body.created_at));
      msg.channel.sendMessage(`**${user}** has been following **${channel}** since: \`\`${body.created_at}\`\`` +
        `\n${utils.formatDuration(d)}`);
      utils.finish(msg, exports.name);
    }
  });
};
