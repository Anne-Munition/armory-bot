import { Snowflake, TextChannel } from 'discord.js'
import { timeoutCmdChannel } from './config'
import Timeout from './database/services/timeout_service'
import client from './discord'
import log from './logger'

const activeTimeouts: { [key: string]: NodeJS.Timeout } = {}

// Get the timeout docs from the database and start timers to remove the timeout
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

// Add a timeout to the database and start a timeout removal timer
export async function add(
  discordId: Snowflake,
  guildId: Snowflake,
  ms: number,
  username: string,
): Promise<void> {
  await Timeout.add(discordId, guildId, ms, username)
  startTimeoutTimer(discordId, ms)
}

// Timer to remove the timeout at a later time
function startTimeoutTimer(discordId: Snowflake, ms: number): void {
  activeTimeouts[discordId] = setTimeout(() => {
    remove(discordId).catch()
  }, ms)
}

// Remove the timeout either manually or from the timer
export async function remove(
  discordId: Snowflake,
  manual = false,
): Promise<void> {
  log.debug(`removing timeout on: ${discordId}`)
  if (activeTimeouts[discordId]) {
    clearTimeout(activeTimeouts[discordId])
    delete activeTimeouts[discordId]
  }
  const timeoutDoc = await Timeout.get(discordId)
  if (!timeoutDoc) return
  await Timeout.remove(timeoutDoc.id)

  const guild = client.guilds.cache.get(timeoutDoc.guild_id)
  if (!guild) return

  const channel = guild.channels.cache.get(timeoutCmdChannel)
  if (!channel || channel.type !== 'GUILD_TEXT') return
  const textChannel = channel as TextChannel

  const member = await guild.members.fetch(timeoutDoc.discord_id)
  let response: string
  if (member) {
    await member.roles.remove(timeoutDoc.roles)
    response = `The timeout has ended for **${member.user.tag}** (${timeoutDoc.discord_id}).`
  } else {
    response = `The timeout has ended for ${timeoutDoc.username}.\nThough they seem to no longer be a member of this guild.`
  }

  if (!manual) await textChannel.send(response)
}
