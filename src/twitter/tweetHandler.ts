import { decode } from 'html-entities'
import logger from '../logger'
import { announce } from '../streamelements'
import * as twitchApi from '../twitch/twitch_api'
import { goingLiveUrl, name } from './config'

const oldTweetIds: string[] = []

export default async function dataConsumer(data: Tweet) {
  logger.debug(JSON.stringify(data, null, 2))
  if (data.in_reply_to_user_id) return
  if (oldTweetIds.includes(data.id)) return
  oldTweetIds.push(data.id)
  if (oldTweetIds.length >= 10) oldTweetIds.shift()
  const isGoingLiveTweet = data.text.includes(goingLiveUrl)
  const [stream] = await twitchApi.getStreams([name])
  if (!stream && !isGoingLiveTweet) return
  let text = decode(data.text)
  const urls = data.entities?.urls?.map((x) => x.url) || []
  urls.forEach((x) => {
    text = text.replace(x, '')
  })
  text = text.replace(/\n+/g, ' ')
  text = text.replace(/\s+/g, ' ')
  text = text.trim()
  const link = `https://twitter.com/${name}/status/${data.id}`

  const message = text
    ? `New tweet from ${name}: "${text}" ${link}`
    : `New tweet from ${name}: ${link}`
  await announce(message)
}
