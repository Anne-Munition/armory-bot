import { ThreadChannel } from 'discord.js'
import log from './logger'
import notify from './notifications'

async function onCreate(thread: ThreadChannel): Promise<void> {
  log.debug(`threadCreate event: ${thread.name}`)
  await notify.pinActiveThreads(thread.guild)
  await notify.threadCreate(thread)
}

async function onUpdate(thread: ThreadChannel): Promise<void> {
  log.debug(`threadUpdate event: ${thread.name}`)
  await notify.pinActiveThreads(thread.guild)
}

async function onDelete(thread: ThreadChannel): Promise<void> {
  log.debug(`threadDelete event: ${thread.name}`)
  await notify.pinActiveThreads(thread.guild)
}

export default {
  onCreate,
  onUpdate,
  onDelete,
}
