'use strict';
const logger = require('winston');

module.exports = function Permissions(client, msg, cmd) {
  return new Promise((resolve, reject) => {
    if (msg.channel.type === 'dm') {
      logger.debug('Command was run in a DM channel. No restrictions');
      resolve();
      return;
    }
    // The bot owner can run any command
    if (msg.author.id === client.config.owner_id) {
      logger.debug('Command was run by bot owner. No restrictions');
      resolve();
      return;
    }
    // The guild owner can run any commands
    if (msg.author.id === msg.guild.ownerID) {
      resolve();
      logger.debug('Command was run by guild owner. No restrictions');
      return;
    }
    logger.debug('Checking permissions:', msg.guild.id, cmd);
    if (client.commandPermissions.has(`${msg.guild.id}_${cmd}`)) {
      const perms = client.commandPermissions.get(`${msg.guild.id}_${cmd}`);
      logger.debug('perms results', JSON.stringify(perms, null, 2));

      const bools = {
        allowMember: perms.allow.members.indexOf(msg.author.id) !== -1,
        denyMember: perms.deny.members.indexOf(msg.author.id) !== -1,
        allowChannel: perms.allow.channels.indexOf(msg.channel.id) !== -1,
        denyChannel: perms.deny.channels.indexOf(msg.channel.id) !== -1,
        allowRole: compareRoles(msg, perms.allow.roles),
        denyRole: compareRoles(msg, perms.deny.roles),
      };

      logger.debug(JSON.stringify(bools, null, 2));
      if (bools.allowMember) {
        logger.debug('Resolved on: allowMember', bools.allowMember);
        resolve();
      } else if (bools.denyMember) {
        logger.debug('Rejected on: denyMember', bools.denyMember);
        reject();
      } else if (bools.allowRole) {
        logger.debug('Resolved on: allowRole', bools.allowRole);
        resolve();
      } else if (bools.denyRole) {
        logger.debug('Rejected on: denyRole', bools.denyRole);
        reject();
      } else if (bools.allowChannel) {
        logger.debug('Resolved on: allowChannel', bools.allowChannel);
        resolve();
      } else if (bools.denyChannel) {
        logger.debug('Rejected on: denyChannel', bools.denyChannel);
        reject();
      } else {
        logger.debug('No resolution from perms results, allowing');
        resolve();
      }
    } else {
      logger.debug('No perms results, allowing');
      resolve();
    }
  });
};

function compareRoles(m, arr) {
  for (let i = 0; i < arr.length; i++) {
    if (m.member.roles.has(arr[i])) {
      return true;
    }
  }
  return false;
}
