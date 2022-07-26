import { CronJob } from 'cron'
import Discord from 'discord.js'
import * as config from './config'
import Birthday from './database/services/birthday_service'
import client from './discord'

function init() {
  new CronJob('0 8 * * *', run, null, true, 'America/New_York')
}

async function run() {
  if (!client) return
  const guildId = config.getGuildId()
  const guild = client.guilds.cache.get(guildId)
  if (!guild) return

  const birthdayRoleId = config.getId(guildId, 'birthdayRoleId')
  if (!birthdayRoleId) return
  const birthdayRole = guild.roles.cache.get(birthdayRoleId)
  if (!birthdayRole) return

  // Remove all birthday roles
  birthdayRole.members.forEach((x) => {
    x.roles.remove(birthdayRole)
  })

  // Search database for people with birthdays today
  const birthdayDocs = await Birthday.getToday()

  const members: Discord.GuildMember[] = []
  birthdayDocs.forEach((x) => {
    const m = guild.members.cache.get(x.discord_id)
    if (m) {
      if (m.roles.cache.has(birthdayRole.id)) return
      // Assign birthday roles
      m.roles.add(birthdayRole)
      members.push(m)
    }
  })

  if (!members.length) return

  // Announce birthdays
  const channelId = config.getId(guildId, 'birthdayAnnouncementChannelId')
  if (!channelId) return
  const channel = guild.channels.cache.get(channelId)
  if (!channel) return
  if (!channel.isText()) return

  const message = `:birthday: **Happy Birthday!** :birthday:\n\n ${members
    .map((x) => x.toString())
    .join('\n')}`
  await channel.send({ content: message })
}

export default init
