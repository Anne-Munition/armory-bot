import { Message } from 'discord.js'
import { legacyReactionWebhookId } from '../config'
import counts from '../counts'
import log from '../logger'
import numberCounter from './numbers'
import schedulePinning from './schedule_pinning'
import spoilerTags from './spoiler_tags'

export default async function (msg: Message): Promise<void> {
  counts.increment('messagesSeen')

  const wasSchedule = await schedulePinning(msg).catch((err) => {
    log.error(err.stack || err.message || err)
  })
  if (wasSchedule) return

  if (msg.author.id === legacyReactionWebhookId) {
    await msg.react('👎')
    await msg.react('👍')
    await msg.react('☑️')
    await msg.react('❌')
  }

  if (msg.author.bot) return

  spoilerTags(msg).catch((err) => {
    log.error(err.stack || err.message || err)
  })

  numberCounter(msg).catch((err) => {
    log.error(err.stack || err.message || err)
  })
}
