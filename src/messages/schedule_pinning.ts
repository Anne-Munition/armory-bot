import Discord from 'discord.js'
import { scheduleChannel } from '../config'

export default async function (msg: Discord.Message): Promise<boolean> {
  if (msg.channel.id === scheduleChannel) {
    if (contentHasScheduleTerms(msg)) {
      const pinnedMessages = await msg.channel.messages.fetchPinned()
      if (pinnedMessages.size)
        pinnedMessages
          .filter((x) => contentHasScheduleTerms(x))
          .forEach((x) => x.unpin())
      await msg.pin()
      return true
    }
  }
  return false
}

function contentHasScheduleTerms(msg: Discord.Message): boolean {
  return msg.content.includes('SCHEDULE')
}
