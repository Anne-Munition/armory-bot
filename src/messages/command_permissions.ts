import { Message } from 'discord.js'
import { commandPerms } from '../collections'
import log from '../logger'

export default (
  message: Message,
  params: string[],
  command: MsgCmd,
): boolean => {
  const cmdName = command.name

  if (message.channel.type === 'DM') {
    log.debug('Command was run in a DM channel. No restrictions')
    return true
  }

  if (message.author.id === process.env.OWNER_ID) {
    log.debug('Command was run by bot owner. No restrictions')
    return true
  }

  if (!message.guild) {
    log.debug('Somehow not in a guild. Denied')
    return false
  }

  if (message.author.id === message.guild.ownerId) {
    log.debug('Command was run by guild owner. No restrictions')
    return true
  }

  if (cmdName === 'perms' && params.length === 1) {
    log.debug("'perms check' has no restrictions")
    return true
  }

  log.debug(
    `Checking Permissions: ${message.author.username} ${message.guild.id} ${cmdName}`,
  )

  const permCode = `${message.guild.id}-${cmdName}`
  const perms = commandPerms.get(permCode)
  if (!perms) {
    log.debug(
      `There were no permission results found for cmd ${cmdName}, allowed`,
    )
    return true
  }

  const { allow, deny } = perms

  // Deny if the member is explicitly denied
  if (deny.members.indexOf(message.author.id) !== -1) {
    log.debug('Member DENIED')
    return false
  }

  // Allow if the member is explicitly allowed
  if (allow.members.indexOf(message.author.id) !== -1) {
    log.debug('Member ALLOWED')
    return true
  }

  // Deny if the command is run in an explicitly denied channel
  if (deny.channels.indexOf(message.channel.id) !== -1) {
    log.debug('Channel DENIED')
    return false
  }

  // Allow if the command is run in an explicitly allowed channel
  if (allow.channels.indexOf(message.channel.id) !== -1) {
    log.debug('Channel ALLOWED')
    return true
  }

  // Allow if the message owner has a role that is explicitly allowed
  if (
    message.member &&
    message.member.roles.cache.some((x) => allow.roles.includes(x.id))
  ) {
    log.debug('Role ALLOWED')
    return true
  }

  // Allow if the message owner has a role that is explicitly denied
  if (
    message.member &&
    message.member.roles.cache.some((x) => deny.roles.includes(x.id))
  ) {
    log.debug('Role DENIED')
    return false
  }

  log.debug('No Permissions found, allowing')
  return true
}
