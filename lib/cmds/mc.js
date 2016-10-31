'use strict';
exports.info = {
  name: 'mc',
  desc: 'Posts stats and online user list of a Nodecraft MC server',
  usage: 'mc',
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

exports.run = (client, msg) => {
  // Exit if we never connected to the nodecraft API
  if (!nodecraftAPI) {
    return;
  }
  // Get server stats
  nodecraftAPI.services.stats(config.nodecraft.server_id, (err, results) => {
    if (err) {
      msg.channel.sendMessage('There was an error getting data for the subscriber server.');
      utils.finish(client, msg, exports.info.name);
      return;
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
    utils.finish(client, msg, exports.info.name);
  });
};
