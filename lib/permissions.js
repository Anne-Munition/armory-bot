'use strict';
const config = require('../config');
const logger = require('winston');

module.exports = function Permissions() {
  function check(client, msg, cmd, params) {
    if (msg.channel.type === 'dm') {
      logger.debug('Command was run in a DM channel. No restrictions');
      return true;
    }
    // The bot owner can run any command
    if (msg.author.id === config.owner_id) {
      logger.debug('Command was run by bot owner. No restrictions');
      return true;
    }
    // The guild owner can run any commands
    if (msg.author.id === msg.guild.ownerID) {
      logger.debug('Command was run by guild owner. No restrictions');
      return true;
    }
    if (cmd === 'perms' && params[0] && params[0].toLowerCase() === 'list') {
      logger.debug('\'perms list\' has no restrictions');
      return true;
    }
    logger.debug('Checking Permissions:', msg.author.name, msg.guild.id, cmd);


    return true;
  }

  return {
    check,
  };
};
