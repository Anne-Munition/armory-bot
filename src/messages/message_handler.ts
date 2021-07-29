import Discord from 'discord.js'
import counts from '../counts'
import log from '../logger'
import prefixedCommands from './prefixed_commands'
import schedulePinning from './schedule_pinning'
import spoilerTags from './spoiler_tags'

export default async function (msg: Discord.Message): Promise<void> {
  counts.increment('messagesSeen')

  const wasSchedule = await schedulePinning(msg).catch((err) => {
    log.error(err)
  })
  if (wasSchedule) return

  if (msg.author.bot) return

  spoilerTags(msg).catch((err) => {
    log.error(err.stack)
  })

  prefixedCommands(msg).catch((err) => {
    log.error(err)
  })
}
