import {
  ETwitterStreamEvent,
  TweetStream,
  TweetV2SingleStreamResult,
  TwitterApi,
} from 'twitter-api-v2'
import logger from '../logger'
import { ownerSend } from '../utilities'
import { name } from './config'
import tweetHandler from './tweetHandler'

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN)

let stream: TweetStream<TweetV2SingleStreamResult>
let initReconnects = 0

export async function init(): Promise<void> {
  // Delete old rules
  const rules = await client.v2.streamRules()
  if (rules.data?.length) {
    await client.v2.updateStreamRules({
      delete: { ids: rules.data.map((rule) => rule.id) },
    })
  }

  // Add new rules
  await client.v2.updateStreamRules({
    add: [{ value: `from:${name}` }],
  })

  await connect()
}

async function connect(): Promise<void> {
  try {
    stream = await client.v2.searchStream({
      // backfill_minutes: minutes.toString(),
      'tweet.fields': ['in_reply_to_user_id', 'entities'],
    })
    // Enable auto reconnect
    stream.autoReconnect = true
    stream.autoReconnectRetries = Infinity

    initReconnects = 0
    logger.info(`Connected to Twitter stream: ${name}`)
    ownerSend(`Connected to Twitter stream: ${name}`)

    stream.on(ETwitterStreamEvent.Data, ({ data }) => {
      tweetHandler(data)
    })

    stream.on(ETwitterStreamEvent.ConnectionClosed, () => {
      logger.warn('Twitter stream connection has been closed.')
    })

    stream.on(ETwitterStreamEvent.ConnectionError, (err) => {
      logger.error(`Twitter connection error: ${err.message}`)
    })

    stream.on(ETwitterStreamEvent.ReconnectAttempt, () => {
      logger.debug('Attempting reconnect')
      if (process.env.NODE_ENV === 'production') {
        const retries = stream.autoReconnectRetries
        if (retries > 1) {
          ownerSend(`Disconnected from the Twitter stream API. Attempting reconnection.`)
        }
        if (retries % 10 === 0) {
          ownerSend(`${retries} reconnect attempts have been made to the Twitter stream API`)
        }
      }
    })

    stream.on(ETwitterStreamEvent.Reconnected, () => {
      if (process.env.NODE_ENV === 'production') {
        ownerSend(`Reconnected to the Twitter stream API`)
      }
    })
  } catch (err) {
    logger.warn(`Error with initial connection to Twitter stream: ${name}`)
    initReconnects++
    if (initReconnects === 20) {
      ownerSend('No initial connection could be made to the Twitter stream API.')
      return
    }
    setTimeout(connect, initReconnects * 5000)
  }
}

export function disconnect(): void {
  stream?.destroy()
}
