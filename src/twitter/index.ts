import { decode } from 'html-entities'
import Twitter from 'twitter-v2'
import TwitterStream from 'twitter-v2/build/TwitterStream'
import logger from '../logger'
import * as se from '../streamelements'
import * as twitchApi from '../twitch/twitch_api'
import { ignore, ownerError } from '../utilities'

let stream: TwitterStream | null
let reconnectInterval: number
let reconnectAttempts: number
let backfill: number | null
let closing: boolean
let reconnecting = false
let connectedTimer: NodeJS.Timer
const oldTweetIds: string[] = []

const name = 'AnneMunition'

const client = new Twitter({
  bearer_token: process.env.TWITTER_BEARER_TOKEN,
})

function reset() {
  reconnectInterval = 1
  reconnectAttempts = 0
  backfill = null
  closing = false
}

export async function init(): Promise<void> {
  reset()
  const existingRules = await client.get('tweets/search/stream/rules').then((response) => {
    return (response as GetRulesResponse).data
  })
  if (existingRules) {
    await client.post('tweets/search/stream/rules', {
      delete: {
        ids: existingRules.map((x) => x.id),
      },
    })
  }

  await client.post('tweets/search/stream/rules', {
    add: [{ value: `from:${name}` }],
  })
}

export async function connect(): Promise<void> {
  let minutes = 0
  if (backfill) minutes = Math.max(Math.floor((Date.now() - backfill) / 1000 / 60) + 1, 5)
  if (connectedTimer) clearTimeout(connectedTimer)
  connectedTimer = setTimeout(() => {
    logger.info('Connected to Twitter stream')
    if (process.env.NODE_ENV === 'production')
      ownerError('Connected to Twitter Stream').catch(ignore)
  }, 3000)

  try {
    stream = client.stream('tweets/search/stream', {
      backfill_minutes: minutes.toString(),
      'tweet.fields': ['in_reply_to_user_id'],
    })

    for await (const { data } of stream) {
      if (reconnecting) reset()
      dataConsumer(data).catch(ignore)
    }
    reconnect()
  } catch (err) {
    reconnect()
  }
}

function reconnect() {
  if (connectedTimer) clearTimeout(connectedTimer)
  if (closing) return
  reconnecting = true
  reconnectAttempts++
  if (!backfill) backfill = Date.now()
  if (reconnectAttempts >= 100) {
    ownerError(
      'There was an issue connecting to the Twitter stream API after several attempts.',
    ).catch(ignore)
    return
  }
  logger.warn(`Twitter stream disconnected. Retrying in ${reconnectInterval} seconds`)
  setTimeout(connect, 1000 * reconnectInterval)
  reconnectInterval *= 2
}

async function dataConsumer(data: Tweet) {
  logger.debug(JSON.stringify(data, null, 2))
  if (data.in_reply_to_user_id) return
  if (oldTweetIds.includes(data.id)) return
  oldTweetIds.push(data.id)
  if (oldTweetIds.length >= 10) oldTweetIds.shift()
  const isGoingLiveTweet = data.text.includes('https://t.co/UEDLazk7gU')
  const [stream] = await twitchApi.getStreams([name])
  if (!stream && !isGoingLiveTweet) return
  const url = `https://twitter.com/${name}/status/${data.id}`
  const text = `/announce New tweet from ${name}: "${decode(data.text)}" (${url})`
  se.say(text).catch(ignore)
}

export function disconnect(): void {
  if (stream) {
    stream.close()
    stream = null
  }
  closing = true
}
