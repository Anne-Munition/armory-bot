'use strict';
const logger = require('winston');
const config = require('../config');

function check(mongo, msg, cmd) {
  return new Promise((resolve, reject) => {
    if (msg.channel.type === 'dm') {
      logger.debug('Command was run in a DM channel. No restrictions');
      resolve(true);
      return;
    }
    logger.debug('Checking permissions:', msg.channel.id, cmd);
    mongo.perms.findOne({ server_id: msg.guild.id, cmd }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        logger.debug('perms results', JSON.stringify(result, null, 2));
        // No perms found. Return setting for blank perms from the config file
        if (result) {
          const b = {
            allowMember: result.perms.allow.members.indexOf(msg.author.id) !== -1,
            denyMember: result.perms.deny.members.indexOf(msg.author.id) !== -1,
            allowChannel: result.perms.allow.channels.indexOf(msg.channel.id) !== -1,
            denyChannel: result.perms.deny.channels.indexOf(msg.channel.id) !== -1,
          };

          b.allowRole = compareRoles(msg, result.perms.allow.roles);
          b.denyRole = compareRoles(msg, result.perms.deny.roles);


          logger.debug(JSON.stringify(b, null, 2));
          if (b.denyMember) {
            logger.debug('Resolved on: denyMember', b.denyMember);
            resolve(false);
          } else if (b.allowMember) {
            logger.debug('Resolved on: allowMember', b.allowMember);
            resolve(true);
          } else if (b.denyRole) {
            logger.debug('Resolved on: denyRole', b.denyRole);
            resolve(false);
          } else if (b.allowRole) {
            logger.debug('Resolved on: allowRole', b.allowRole);
            resolve(true);
          } else if (b.denyChannel) {
            logger.debug('Resolved on: denyChannel', b.denyChannel);
            resolve(false);
          } else if (b.allowChannel) {
            logger.debug('Resolved on: allowChannel', b.allowChannel);
            resolve(true);
          } else {
            logger.debug('No resolution from perms results, using default - allow:', !config.commands.deny_blank_perms);
            resolve(!config.commands.deny_blank_perms);
          }
        } else {
          logger.debug('No perms results, using default - allow:', !config.commands.deny_blank_perms);
          resolve(!config.commands.deny_blank_perms);
        }
      }
    });
  });
}

function compareRoles(m, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (m.member.roles.has(arr[i])) {
      return true;
    }
  }
  return false;
}

module.exports = {
  check,
};
