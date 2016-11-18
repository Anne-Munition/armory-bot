'use strict';
exports.info = {
  name: 'twitchid',
  desc: 'Get the Twitch ID for a specifies user',
  usage: 'twitchid <name>',
};

const logger = require('winston');
const config = require('../../config.js');
const utils = require('../utilities.js');

exports.run = (discord, msg, params = []) => {
  if (params.length === 0) {
    return;
  }
  const uri = `https://api.twitch.tv/kraken/users/${params[0]}?client_id=${config.twitch.clientID}`;
  logger.debug(uri);
  v5request(uri)
  .then(body => {
    const name = body.display_name || body.name;
    msg.channel.sendMessage(`${name} => ${body._id}`);
  })
  .catch(err => {
    if (err === 404) {
      msg.channel.sendMessage(`Channel: ${params[0]} does not exist.`);
    }
  });
};

function v5request(uri) {
  return new Promise((resolve, reject) => {
    request.get({
      url: encodeURI(uri),
      json: true,
      headers: {
        Accept: 'application/vnd.twitchtv.v5+json',
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
