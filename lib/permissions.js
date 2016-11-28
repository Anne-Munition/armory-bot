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
      if (cmd === 'perms' && params.length === 1) {
        logger.debug('\'perms check\' has no restrictions');
        resolve(true);
        return;
      }
      logger.debug('Checking Permissions:', msg.author.username, msg.guild.id, cmd);
      client.mongo.perms.findOne({
        server_id: msg.guild.id,
        cmd,
      })
        .then(result => {
          if (!result) {
            // Allowed if we have not set a permission for it
            logger.debug(`There were no permission results found for cmd ${cmd}, allowed`);
            resolve(true);
            return;
          }
          const denied = result.perms.deny;
          const allowed = result.perms.allow;

          // Deny if the member is explicitly denied
          if (denied.members.indexOf(msg.author.id) !== -1) {
            logger.debug('Member DENIED');
            resolve(false);
            return;
          }

          // Allow if the member is explicitly allowed
          if (allowed.members.indexOf(msg.author.id) !== -1) {
            logger.debug('Member ALLOWED');
            resolve(true);
            return;
          }

          // Deny if the command is run in an explicitly denied channel
          if (denied.channels.indexOf(msg.channel.id) !== -1) {
            logger.debug('Channel DENIED');
            resolve(false);
            return;
          }

          // Allow if the command is run in an explicitly allowed channel
          if (allowed.channels.indexOf(msg.channel.id) !== -1) {
            logger.debug('Channel ALLOWED');
            resolve(true);
            return;
          }

          // Deny if the message owner has a role that is explicitly denied
          const roles = msg.member.roles;
          let foundRole = null;
          roles.forEach(r => {
            if (denied.roles.indexOf(r.id) !== -1) {
              logger.debug('Role DENIED');
              resolve(false);
              foundRole = true;
            }
            if (allowed.roles.indexOf(r.id) !== -1) {
              logger.debug('Role ALLOWED');
              resolve(true);
              foundRole = true;
            }
          });

          if (foundRole) {
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
