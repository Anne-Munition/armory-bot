'use strict';
exports.info = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name>',
  aliases: [],
};

const logger = require('winston');
const config = require('../../config');
const request = require('request');
const utils = require('../utilities');

exports.run = (discord, msg, params = []) => {
  if (params.length === 0) {
    return;
  }
  params.map(p => p.toLowerCase());
  const uri = `https://api.twitch.tv/kraken/users/${params[0]}?client_id=${config.twitch.client_id}`;
  logger.debug(uri);
  utils.time(msg, 'cpu');
  v3request(uri)
    .then(body => {
      utils.time(msg, 'io');
      const name = body.display_name || body.name;
      msg.channel.sendMessage(`${name} => **${body._id}**`);
      utils.finish(msg, exports.name);
    })
    .catch(err => {
      utils.time(msg, 'io');
      if (err === 404) {
        msg.channel.sendMessage(`Channel: **${params[0]}** does not exist.`);
        utils.finish(msg, exports.name);
      }
    });
};

function v3request(uri) {
  return new Promise((resolve, reject) => {
    request.get({
      url: encodeURI(uri),
      json: true,
      headers: {
        Accept: 'application/vnd.twitchtv.v3+json',
      },
    }, (err, res, body) => {
      if (err) {
        reject(err);
      } else if (res.statusCode !== 200) {
        reject(res.statusCode);
      } else {
        resolve(body);
      }
    });
  });
}
