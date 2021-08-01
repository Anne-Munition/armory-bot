import { Message } from 'discord.js'
import now from 'performance-now'
import { guildConfigs } from '../collections'
import { aliases, msgCommands } from '../collections'
import counts from '../counts'
import { defaultGuildConfig } from '../database/services/guild_config_service'
import client from '../discord'
import log from '../logger'
import { dmDenied, ownerError, usage } from '../utilities'
import perms from './command_permissions'

export default async function (msg: Message): Promise<void> {
  const prefix = getPrefix(msg)
  if (!prefix) return

  const params = msg.content.split(/ +/g)
  const cmdTrigger = params.shift()
  if (!cmdTrigger) return
  const cmd = cmdTrigger.slice(prefix.length).toLowerCase()
  if (!cmd) return
  log.debug(`command: ${cmd} ${JSON.stringify(params)}`)

  const command = getCommand(msg, cmd)
  if (!command) return
  command.prefixUsed = prefix
  command.nameUsed = cmd

  if (!command.info.dmAllowed && msg.channel.type === 'DM') {
    log.info(`${command.name} denied in DM channel`)
    await dmDenied(msg, command)
    return
  }

  const allowed = checkPermissions(msg, params, command)

  if (allowed) {
    log.info(
      `ALLOWED '${msg.author.username}' ${cmd}' in channel ` +
        `'${msg.channel.type === 'DM' ? 'DM' : msg.channel.name}'`,
    )

    if (command.info.paramsRequired && !params.length) {
      log.info(`${command.name} requires at least one argument`)
      await usage(msg, command)
      return
    }

    const start = now()
    try {
      await command.run(msg, params, command)
      const end = now()
      counts.increment('msgCommandsRan')
      log.info(`${command.name} finished in: ${(end - start).toFixed(3)} ms`)
    } catch (err) {
      ownerError('Command Error', err, msg, command).catch(() => {
        // Do Nothing
      })
    }
  } else {
    log.info(
      `DENIED '${msg.author.username}' ${cmd}' in channel ` +
        `'${msg.channel.type === 'DM' ? 'DM' : msg.channel.name}'`,
    )
    await msg.reply('You do not have permission to run this command here.')
  }
}

function getPrefix(message: Message): string | undefined {
  let conf = defaultGuildConfig
  if (message.channel.type === 'GUILD_TEXT') {
    if (!message.guild) return
    const configs = guildConfigs.get(message.guild.id)
    if (configs) conf = configs
    if (!message.content.startsWith(conf.prefix)) return
  } else if (message.channel.type === 'DM') {
    if (!message.content.startsWith(conf.prefix)) {
      const anyConfig = guildConfigs.find((config) =>
        message.content.startsWith(config.prefix),
      )
      if (!anyConfig) return
      conf.prefix = anyConfig.prefix
    }
  }
  return conf.prefix
}

function getCommand(message: Message, cmdName: string): MsgCmd | undefined {
  let command: MsgCmd | undefined
  command = msgCommands.get(cmdName)
  if (!command) command = aliases.get(cmdName)
  if (!command || !command.run || typeof command.run !== 'function') {
    log.warn(
      `The cmd '${cmdName}' does not exist, is not loaded, or is missing the 'run' function`,
    )
    return
  }

  if (message.channel.type === 'DM') {
    log.info(`[DM] <${message.author.tag}>: ${message.content}`)
  } else {
    if (!message.guild) return
    log.info(
      `[${message.guild.name}] (#${message.channel.name}) ` +
        `<${message.author.tag}>: ${message.content}`,
    )
  }

  return command
}

function checkPermissions(
  message: Message,
  params: string[],
  command: MsgCmd,
): boolean {
  log.debug(
    `Command Required Permissions: ${JSON.stringify(command.info.permissions)}`,
  )
  if (!client.user) return false
  if (message.channel.type === 'GUILD_TEXT') {
    const permsFor = message.channel.permissionsFor(client.user)
    if (!permsFor || !permsFor.has(command.info.permissions)) {
      ownerError('Permission Requirement', undefined, message, command).catch(
        () => {
          // Do Nothing
        },
      )
      log.error('Missing required permissions in this channel.')
      return false
    }
  }

  return perms(message, params, command)
}
