import _ from 'lodash'
import client from '../discord'
import logger from '../logger'
import { getUsers } from '../twitch/twitch_api'
import { ignore, ownerError } from '../utilities'
import AuditChannel from './services/audit_channel_service'
import NotificationChannel from './services/notification_channel_service'
import TwitchChannel from './services/twitch_channel_service'

function init() {
  setInterval(cleanup, 1000 * 60 * 60 * 12)
  cleanup().catch(ignore)
}

async function cleanup() {
  logger.debug('Running cleanup tasks')
  try {
    await cleanDocs(AuditChannel)
    await cleanDocs(NotificationChannel)
    await cleanTwitchChannels()
  } catch (err: any) {
    if (err instanceof Error) {
      ownerError('Database Cleanup Error', err).catch(ignore)
    } else {
      ownerError('Database Cleanup Error', undefined, err).catch(ignore)
    }
  }
}

async function cleanDocs(service: typeof NotificationChannel | typeof AuditChannel) {
  const docs = await service.search({})
  for (let i = 0; i < docs.length; i++) {
    const guild = await client.guilds.cache.get(docs[i].guild_id)
    const channel = await client.channels.cache.get(docs[i].channel_id)
    if (!guild || !channel) await service.remove(docs[i]._id)
  }
}

async function cleanTwitchChannels() {
  const docs = await TwitchChannel.search({})
  const ids = docs.map((x) => x.twitch_id)
  const idChunks = _.chunk(ids, 100)
  let users: HelixUser[] = []
  for (let i = 0; i < idChunks.length; i++) {
    const userChunk = await getUsers(idChunks[i])
    users = users.concat(userChunk)
  }
  for (let i = 0; i < docs.length; i++) {
    const twitchChannelExists = users.find((x) => x.id === docs[i].twitch_id)
    if (!twitchChannelExists) {
      await TwitchChannel.remove(docs[i]._id)
      continue
    }
    const toRemove: number[] = []
    for (let j = docs[i].channels.length - 1; j >= 0; j--) {
      const obj = docs[i].channels[j]
      const guild = await client.guilds.cache.get(obj.guild_id)
      const channel = await client.channels.cache.get(obj.channel_id)
      if (!guild || !channel) {
        toRemove.push(j)
      }
    }
    toRemove.forEach((x) => {
      docs[i].channels.splice(x, 1)
    })
    if (!docs[i].channels.length) {
      await TwitchChannel.remove(docs[i]._id)
      continue
    }
    if (toRemove.length) await TwitchChannel.save(docs[i])
  }
}

export default {
  init,
}
