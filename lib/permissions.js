'use strict';
const config = require('../config');
const logger = require('winston');

module.exports = function Permissions() {
  function check(client, msg, cmd, params) {
    return new Promise((resolve, reject) => {
      if (msg.channel.type === 'dm') {
        logger.debug('Command was run in a DM channel. No restrictions');
        resolve(true);
        return;
      }
      // The bot owner can run any command
      if (msg.author.id === config.owner_id) {
        logger.debug('Command was run by bot owner. No restrictions');
        resolve(true);
        return;
      }
      // The guild owner can run any commands
      if (msg.author.id === msg.guild.ownerID) {
        logger.debug('Command was run by guild owner. No restrictions');
        resolve(true);
        return;
      }
      if (cmd === 'perms' && params[0] && params[0].toLowerCase() === 'list') {
        logger.debug('\'perms list\' has no restrictions');
        resolve(true);
        return;
      }
      logger.debug('Checking Permissions:', msg.author.name, msg.guild.id, cmd);
      client.mongo.perms.findOne({
        server_id: msg.guild.id,
        cmd,
      })
        .then(result => {
          if (!result) {
            // Allowed if we have not set a permission for it
            logger.debug(`There were no permission results found for cmd ${cmd}`);
            resolve(true);
            return;
          }
          const perms = result.perms;

          // Deny if the member is denied
          if (perms.members.indexOf(msg.author.id) !== -1) {
            logger.debug('Member denied');
            resolve(false);
            return;
          }



          logger.debug('No Permissions found, allowing');
          resolve(true);
        })
        .catch(reject);
    });
  }

  return {
    check,
  };
};
