'use strict';
exports.info = {
  name: 'following',
  desc: 'Posts Twitch following info for the user provided.',
  usage: '8ball <question>',
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
  const user = params[0].toLowerCase();
  const channel = config.twitch.channel.toLowerCase();

  const channelUri = `https://api.twitch.tv/kraken/users/${user}/follows/channels/` +
    `${channel}?client_id=${config.twitch.client_id}`;
  logger.debug(channelUri);
  request.get({
    url: encodeURI(channelUri),
    json: true,
  }, (err, res, body) => {
    if (err || res.statusCode !== 200) {
      msg.channel.sendMessage(`**${user}** does not follow **${channel}**`);
    } else {
      const d = moment.duration(moment() - moment(body.created_at));
      msg.channel.sendMessage(`**${user}** has been following **${channel}** since: \`\`${body.created_at}\`\`` +
        `\n${utils.formatDuration(d)}`);
    }
  });
};
