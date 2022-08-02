import { CronJob } from 'cron'
import Discord from 'discord.js'
import { DateTime } from 'luxon'
import * as config from './config'
import Birthday from './database/services/birthday_service'
import client from './discord'
import logger from './logger'

const cronTime = process.env.NODE_ENV === 'production' ? '0 8 * * *' : '*/1 * * * *'

function init() {
  new CronJob(cronTime, run, null, true, 'America/New_York')
}

async function run() {
  if (!client) return
  const guildId = config.getGuildId()
  const channelId = config.getId(guildId, 'birthdayAnnouncementChannelId')
  const birthdayRoleId = config.getId(guildId, 'birthdayRoleId')
  if (!guildId || !channelId || !birthdayRoleId) return
  const guild = client.guilds.cache.get(guildId)
  if (!guild) return
  const channel = guild.channels.cache.get(channelId)
  const birthdayRole = guild.roles.cache.get(birthdayRoleId)
  if (!channel || !channel.isText() || !birthdayRole) return

  // Remove any pinned birthday messages
  const pinnedMessages = await channel.messages.fetchPinned()
  if (pinnedMessages.size)
    pinnedMessages
      .filter((x) => x.content.startsWith(':birthday: **Happy Birthday!** :birthday:'))
      .forEach((x) => x.unpin())

  // Remove all birthday roles
  birthdayRole.members.forEach((x) => {
    x.roles.remove(birthdayRole).catch(() => {
      // Do Nothing
    })
  })

  // Search database for people with birthdays today
  const today = getTodayDate()
  const birthdayDocs = await Birthday.get(today)
  logger.debug(`Birthday docs: ${today} - ${birthdayDocs.length}`)

  const members: Discord.GuildMember[] = []
  for (let i = 0; i < birthdayDocs.length; i++) {
    const m = await guild.members.fetch(birthdayDocs[i].discord_id)
    if (m) {
      if (m.roles.cache.has(birthdayRole.id)) return
      // Assign birthday roles
      m.roles.add(birthdayRole).catch(() => {
        // Do Nothing
      })
      members.push(m)
    }
  }

  if (!members.length) return

  // Announce birthdays
  const message = `:birthday: **Happy Birthday!** :birthday:\n\n ${members
    .map((x) => `<@${x.id}>`)
    .join('\n')}`
  const msg = await channel.send({
    content: message,
    options: { allowedMentions: { parse: ['users'] } },
  })
  await msg.pin()
}

export default init

export function getTodayDate(): string {
  return DateTime.now().toUTC().toFormat('MM/dd')
}
