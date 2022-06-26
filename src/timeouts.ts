import Discord, { Snowflake, TextChannel } from 'discord.js'
import { getId } from './config'
import Timeout from './database/services/timeout_service'
import client from './discord'
import log from './logger'

// Get the timeout docs from the database and start timers to remove the timeout
export async function init(): Promise<void> {
  log.debug('init timeouts module')
  const timeouts = await Timeout.list()
  log.debug(`${timeouts.length} existing timeouts`)
  setInterval(checkTimeouts, 1000 * 60)
}

// Add a timeout to the database and start a timeout removal timer
export async function add(
  member: Discord.GuildMember,
  guildId: Snowflake,
  channelId: Snowflake,
  ms: number,
  username: string,
  reason: string,
): Promise<void> {
  await addRole(member, getId(guildId, 'muteRole'), reason)
  await Timeout.add(member.id, guildId, channelId, ms, username)
}

// Check for expired timeouts
async function checkTimeouts(): Promise<void> {
  const timeouts = await Timeout.list()
  timeouts.forEach((timeout) => {
    if (Date.now() >= new Date(timeout.expires_at).valueOf()) remove(timeout.user_id)
  })
}

// Remove the timeout either manually or from the timer
export async function remove(userId: Snowflake, manual = false): Promise<void> {
  log.debug(`removing timeout on: ${userId}`)
  const timeoutDoc = await Timeout.get(userId)
  if (!timeoutDoc) return
  await Timeout.remove(timeoutDoc.id)

  const guild = client.guilds.cache.get(timeoutDoc.guild_id)
  if (!guild) return

  const channel = guild.channels.cache.get(timeoutDoc.channel_id)
  if (!channel || channel.type !== 'GUILD_TEXT') return
  const textChannel = channel as TextChannel

  const member = await guild.members.fetch(timeoutDoc.user_id)
  let response: string
  if (member) {
    response = `The timeout has expired for ${member}.`
    const reason = manual ? 'Timeout manually removed' : 'The timeout has expired.'
    await removeRole(member, timeoutDoc.roles, reason)
  } else {
    response = `The timeout has expired for ${timeoutDoc.username}.\nThough they seem to no longer be a member of this guild.`
  }

  if (!manual) await textChannel.send(response)
}

export async function addRole(
  member: Discord.GuildMember,
  roles: Snowflake | Snowflake[] | null,
  reason: string,
) {
  if (!roles) return
  await member.roles.add(roles, reason)
}

async function removeRole(
  member: Discord.GuildMember,
  roles: Snowflake | Snowflake[],
  reason: string,
) {
  await member.roles.remove(roles, reason)
}
