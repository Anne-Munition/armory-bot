'use strict'
const config = require('../config')
const logger = require('winston')

module.exports = () => {
  function check(client, msg, cmd, params = []) {
    if (msg.channel.type === 'dm') {
      logger.debug('Command was run in a DM channel. No restrictions')
      return true
    }
    // The bot owner can run any command
    if (msg.author.id === config.owner_id) {
      logger.debug('Command was run by bot owner. No restrictions')
      return true
    }
    // The guild owner can run any command
    if (msg.author.id === msg.guild.ownerID) {
      logger.debug('Command was run by guild owner. No restrictions')
      return true
    }
    if (cmd === 'perms' && params.length === 1) {
      logger.debug("'perms check' has no restrictions")
      return true
    }
    logger.debug(
      'Checking Permissions:',
      msg.author.username,
      msg.guild.id,
      cmd,
    )

    const permCode = `${msg.guild.id}-${cmd}`
    if (!client.commandPerms.has(permCode)) {
      // Allowed if we have not set a permission for it
      logger.debug(
        `There were no permission results found for cmd ${cmd}, allowed`,
      )
      return true
    }

    const denied = client.commandPerms.get(permCode).deny
    const allowed = client.commandPerms.get(permCode).allow

    // Deny if the member is explicitly denied
    if (denied.members.indexOf(msg.author.id) !== -1) {
      logger.debug('Member DENIED')
      return false
    }

    // Allow if the member is explicitly allowed
    if (allowed.members.indexOf(msg.author.id) !== -1) {
      logger.debug('Member ALLOWED')
      return true
    }

    // Deny if the command is run in an explicitly denied channel
    if (denied.channels.indexOf(msg.channel.id) !== -1) {
      logger.debug('Channel DENIED')
      return false
    }

    // Allow if the command is run in an explicitly allowed channel
    if (allowed.channels.indexOf(msg.channel.id) !== -1) {
      logger.debug('Channel ALLOWED')
      return true
    }

    // Allow if the message owner has a role that is explicitly allowed
    if (msg.member.roles.cache.some((x) => allowed.roles.includes(x.id))) {
      logger.debug('Role ALLOWED')
      return true
    }

    // Allow if the message owner has a role that is explicitly denied
    if (msg.member.roles.cache.some((x) => denied.roles.includes(x.id))) {
      logger.debug('Role DENIED')
      return false
    }

    logger.debug('No Permissions found, allowing')
    return true
  }

  return {
    check,
  }
}
