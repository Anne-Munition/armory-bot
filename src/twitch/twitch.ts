import { GuildChannel, MessageEmbed } from 'discord.js'
import counts from '../counts'
import { TwitchChannelDoc } from '../database/models/twitch_channel_model'
import TwitchChannel from '../database/services/twitch_channel_service'
import client from '../discord'
import log from '../logger'
import getChannelColor from './getChannelColor'
import { getStreams, getUsers } from './twitch_api'

let firstCheck = true
let lastState: { [key: string]: HelixStream } = {}

export function startTimers(): void {
  // Check once shortly after startup
  setTimeout(async () => {
    try {
      await updateUserData()
      await checkLive()
      log.debug('twitch - initial check complete')
    } catch (err: any) {
      log.error(err.stack || err.message || err)
    }
  }, 1000 * 10)

  // Check repeatedly on a schedule
  setInterval(async () => {
    try {
      await checkLive()
      log.debug('twitch - live stream check complete')
    } catch (err: any) {
      log.error(err.stack || err.message || err)
    }
  }, 1000 * 60 * 2)
  setInterval(async () => {
    try {
      await updateUserData()
      log.debug('twitch - user data update complete')
    } catch (err: any) {
      log.error(err.stack || err.message || err)
    }
  }, 1000 * 60 * 60 * 6)
}

async function checkLive(): Promise<void> {
  log.debug('twitch - checking live streams')

  // Get all the records from the mongo db
  const docs = await TwitchChannel.list()
  if (!docs.length) {
    lastState = {}
    return
  }

  // Filter for twitch ids that have an available Discord channel with at least one registered channel with send permissions
  const ids = docs
    .filter((doc) => {
      for (let i = 0; i < doc.channels.length; i++) {
        if (!client || !client.user) continue
        const discordChannel = doc.channels[i]
        const guild = client.guilds.cache.get(discordChannel.guild_id)
        if (!guild) continue
        const channel = guild.channels.cache.get(discordChannel.channel_id)
        if (!channel || channel.type !== 'GUILD_TEXT') continue
        const perms = channel.permissionsFor(client.user)
        if (!perms) continue
        return perms.has(['SEND_MESSAGES'])
      }
      return false
    })
    .map((r) => r.twitch_id)

  // Store the number of filtered ids for the stats command
  counts.set('twitchStreams', ids.length)

  // Get the number of registered channels with send permissions
  const allowedChannels = docs
    .filter((doc) => ids.includes(doc.twitch_id))
    .reduce((a, b) => {
      const channels = b.channels
        .map((channel) => {
          const guild = client.guilds.cache.get(channel.guild_id)
          if (!guild) return null
          return guild.channels.cache.get(channel.channel_id)
        })
        .filter((c) => {
          if (!c) return false
          if (!client || !client.user) return false
          const perms = c.permissionsFor(client.user)
          if (!perms) return false
          return perms.has(['SEND_MESSAGES'])
        })
      return a + channels.length
    }, 0)

  // Store the number of registered channels we have send permissions in for the stats command
  counts.set('twitchChannels', allowedChannels)

  // Don't continue if we don't have any channels to send to
  if (counts.get('twitchChannels') === 0) {
    log.debug('no available channels to send twitch streams posts to')
    return
  }

  // Split the filtered ids into 100 max length chunk arrays
  // Twitch will only allow look-ups of 100 streams per call
  const idsArray = []
  while (ids.length > 100) {
    idsArray.push(ids.splice(0, 100))
  }
  if (ids.length) idsArray.push(ids)

  // Fetch all stream statuses from Twitch and merge back into a single array
  const promiseArray = idsArray.map((i) => getStreams(i))
  const streamArrays = await Promise.all(promiseArray)
  const streams = streamArrays.reduce((a, b) => a.concat(...b), [])

  // Save state on first connect then check differences every time after
  if (firstCheck) {
    firstCheck = false
  } else {
    const newStreams: HelixStream[] = []
    const gameChanged: HelixStream[] = []
    // Determine which streams are new and which have changed games
    streams.forEach((stream) => {
      if (lastState[stream.user_id]) {
        // Stream was live on last api check, see if the game has changed
        const lastGame = lastState[stream.user_id].game_id
        if (lastGame !== stream.game_id) {
          gameChanged.push(stream)
        }
      } else {
        // The stream is new on this api check
        newStreams.push(stream)
      }
    })

    newStreams.forEach((stream) => {
      post(docs, stream)
    })

    gameChanged.forEach((stream) => {
      post(docs, stream, lastState[stream.user_id])
    })
  }

  // Store state for next api check
  lastState = {}
  streams.forEach((stream) => {
    lastState[stream.user_id] = stream
  })
}

async function post(
  docs: TwitchChannelDoc[],
  stream: HelixStream,
  last?: HelixStream,
): Promise<void> {
  // Increment the counter for how many twitch stream changes we have posted
  counts.increment('twitchLivePosts')
  // Get the data for this twitch id out of the mongo results
  const doc = docs.find((x) => x.twitch_id === stream.user_id)
  if (!doc) return

  const logo =
    doc.image_url || 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png'

  const embed = new MessageEmbed()
    .setColor(doc.hex)
    .setThumbnail(logo)
    .addField('Channel:', `[${doc.display_name}](https://www.twitch.tv/${doc.login})`, true)
    .addField('Status:', last ? 'Changed Games' : 'Started Streaming', true)
    .setFooter({
      text: 'twitch.tv',
      iconURL: 'https://www.shareicon.net/data/2016/10/18/844051_media_512x512.png',
    })
  if (last) {
    embed
      .addField('New Game:', stream.game_name || 'UNKNOWN')
      .addField('Old Game:', last.game_name || 'UNKNOWN')
  } else {
    embed.addField('Game:', stream.game_name || 'UNKNOWN')
  }
  if (stream.title) embed.addField('Title:', stream.title)

  const channels: GuildChannel[] = []
  doc.channels.forEach((c) => {
    if (!client.user) return
    const guild = client.guilds.cache.get(c.guild_id)
    if (!guild) return
    const channel = guild.channels.cache.get(c.channel_id)
    if (!channel || channel.type !== 'GUILD_TEXT') return
    const perms = channel.permissionsFor(client.user)
    if (!perms || !perms.has(['SEND_MESSAGES'])) return
    channels.push(channel)
  })
  channels.forEach((channel) => {
    if (!channel.isText()) return
    channel.send({ embeds: [embed] })
  })
}

// Keep DB up to date with login, display_name, or avatar changes
async function updateUserData(): Promise<void> {
  log.debug('twitch - updating user data')

  // Get all the records from the mongo db
  const docs = await TwitchChannel.list()
  if (!docs.length) return
  // Get an array of all twitch ids
  const ids = docs.map((doc) => doc.twitch_id)

  // Split the filtered ids into 100 max length chunk arrays
  // Twitch will only allow look-ups of 100 streams per call
  const idsArray = []
  while (ids.length > 100) {
    idsArray.push(ids.splice(0, 100))
  }
  if (ids.length) idsArray.push(ids)

  const promiseArray = idsArray.map((i) => getUsers(i))
  const userArrays = await Promise.all(promiseArray)
  const users = userArrays.reduce((a, b) => a.concat(...b), [])

  // Loop through all the mongo results
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i]
    // Get the matching twitch results
    const user = users.find((x) => x.id === doc.twitch_id)
    if (!user) return
    const color = await getChannelColor(user)

    // Save record if data is different from twitch
    // display_name or profile_image_url or login
    if (
      doc.display_name !== user.display_name ||
      doc.login !== user.login ||
      doc.image_url !== user.profile_image_url ||
      (color && doc.hex !== color)
    ) {
      doc.display_name = user.display_name
      doc.image_url = user.profile_image_url
      doc.login = user.login
      if (color) doc.hex = color
      await TwitchChannel.save(doc)
    }
  }
}
