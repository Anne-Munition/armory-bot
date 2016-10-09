'use strict';
exports.info = {
  name: 'mc',
  desc: 'Posts stats and online user list of a Nodecraft MC server',
  usage: 'mc',
};

const nodecraft = require('nodecraft-api');
const config = require('../../config');
const utils = require('../utilities');
const logger = require('winston');

// Set Nodecraft API credentials
const nodecraftAPI = nodecraft(config.nodecraft.username, config.nodecraft.api_key);

exports.run = (d, m) => {
  // Get server stats
  nodecraftAPI.services.stats(config.nodecraft.server_id, (err, results) => {
    if (err) {
      m.channel.sendMessage('There was an error getting data for the subscriber server.');
    } else {
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
      m.channel.sendMessage(str);
    }
  });
};
