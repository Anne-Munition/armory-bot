'use strict';
exports.info = {
  desc: 'Posts stats and online user list of the Nodecraft MC Sub Server.',
  usage: '',
  aliases: [],
};

const nodecraft = require('nodecraft-api');
const config = require('../../config');
const utils = require('../utilities');
const logger = require('winston');

let nodecraftAPI;
// Set Nodecraft API credentials
if (config.nodecraft.username !== '' && config.nodecraft.api_key !== '') {
  nodecraftAPI = nodecraft(config.nodecraft.username, config.nodecraft.api_key);
}

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Exit if we never connected to the nodecraft API
  if (!nodecraftAPI) {
    return reject('Bad/Missing Nodecraft credentials');
  }
  // Get server stats
  nodecraftAPI.services.stats(config.nodecraft.server_id, (err, results) => {
    if (err) {
      msg.channel.sendMessage('There was an error getting data for the subscriber server.');
      return reject(err);
    }
    logger.debug(JSON.stringify(results));
    const status = utils.capitalize(results.stats.status);
    let str = `\`\`\`Minecraft Subscriber Server Statistics\`\`\`Status: **${status}**`;
    const uptime = results.stats.time;
    const players = results.stats.players;
    if (status === 'Online') {
      str += ` - Uptime: **${uptime}** - Players Online: **${players.length}**`;
      const names = players
        .map(x => {
          return { name: x.username, modified: x.username.toLowerCase() };
        }).sort((a, b) => {
          if (a.modified < b.modified) {
            return -1;
          } else if (a.modified > b.modified) {
            return 1;
          } else {
            return 0;
          }
        });
      str += '\n\n';
      names.forEach(n => {
        str += n.name.replace(/_/gm, '\\_');
        if (names.indexOf(n) < names.length - 1) {
          str += ' | ';
        }
      });
    }
    msg.channel.sendMessage(str);
    return resolve();
  });
  return null;
});
