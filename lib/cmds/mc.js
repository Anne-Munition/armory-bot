'use strict';
exports.info = {
  desc: 'Posts stats and online user list of the Nodecraft MC Sub Server.',
  usage: '',
  aliases: [],
};

const nodecraft = require('nodecraft-api');

exports.run = (client, msg) => new Promise((resolve, reject) => {
  let nodecraftAPI;
  // Set Nodecraft API credentials
  if (client.config.nodecraft.username !== '' && client.config.nodecraft.api_key !== '') {
    nodecraftAPI = nodecraft(client.config.nodecraft.username, client.config.nodecraft.api_key);
  }
  // Exit if we never connected to the nodecraft API
  if (!nodecraftAPI) {
    reject(new Error('Bad/Missing Nodecraft credentials'));
    return;
  }
  // Get server stats
  nodecraftAPI.services.stats(client.config.nodecraft.server_id, (err, results) => {
    if (err) {
      msg.channel.sendMessage('There was an error getting data from the subscriber server.');
      reject(err);
      return;
    }
    client.logger.debug(JSON.stringify(results));
    const status = client.utils.capitalize(results.stats.status);
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
    msg.channel.sendMessage(str).then(resolve).catch(reject);
  });
});

// TODO: Embeds with minecraft picture?
