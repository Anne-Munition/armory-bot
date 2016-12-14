'use strict';
exports.info = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name>',
  aliases: [],
};

const logger = require('winston');
const config = require('../../config');
const utils = require('../utilities');

exports.run = (discord, msg, params = []) => new Promise((resolve, reject) => {
  if (params.length === 0) {
    utils.usage(msg, exports.info);
    return resolve();
  }
  params = params.map(p => p.toLowerCase());
  const uri = `https://api.twitch.tv/kraken/users?login=${params.join(' ')}&api_version=5` +
    `&client_id=${config.twitch.client_id}`;
  logger.debug(uri);
  utils.requestJSON(uri)
    .then(body => {
      const name = body.users[0].display_name || body.users[0].name;
      msg.channel.sendMessage(`${name} => **${body.users[0]._id}**`);
      return resolve();
    })
    .catch(err => {
      if (err === 404) {
        msg.channel.sendMessage(`Channel: **${params[0]}** does not exist.`);
      }
      return reject(err);
    });
  return null;
});
