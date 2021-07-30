import { Snowflake, TextChannel } from 'discord.js'
import { modChannel } from './config'
import Timeout from './database/services/timeout_service'
import client from './discord'
import log from './logger'

export async function init(): Promise<void> {
  log.debug('init timeouts module')
  const timeouts = await Timeout.list()
  log.debug(`${timeouts.length} existing timeouts`)
  timeouts.forEach((timeout) => {
    const duration =
      new Date(timeout.expires_at).valueOf() - new Date().valueOf()
    startTimeoutTimer(timeout.discord_id, duration)
  })
}

function startTimeoutTimer(discordId: Snowflake, ms: number): void {
  setTimeout(() => {
    remove(discordId).catch()
  }, ms)
}

// TODO remove from cmd?
export async function remove(discordId: Snowflake): Promise<void> {
  log.debug(`removing timeout on: ${discordId}`)
  const timeoutDoc = await Timeout.get(discordId)
  if (!timeoutDoc) return
  const guild = client.guilds.cache.get(timeoutDoc.guild_id)
  if (!guild) return
  const member = guild.members.cache.get(timeoutDoc.discord_id)
  if (!member) return

  await member.roles.remove(timeoutDoc.roles)
  await timeoutDoc.remove()

  const modChan = guild.channels.cache.get(modChannel)
  if (!modChan || modChan.type !== 'GUILD_TEXT') return
  const textChannel = modChan as TextChannel

  const response = `The timeout has ended for **${member.user.tag}** (${member.user.id})`
  await textChannel.send(response)
}

export async function add(discordId: Snowflake): Promise<void> {
  // TODO: from cmd
}
