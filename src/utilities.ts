import axios from 'axios'
import dayjs from 'dayjs'
import duration, { Duration } from 'dayjs/plugin/duration'
import { Message, Snowflake } from 'discord.js'
import Vibrant from 'node-vibrant'
import client from './discord'
import log from './logger'

dayjs.extend(duration)

export function capitalize(word: string): string {
  return word.replace(/\b\w/g, (l) => l.toUpperCase())
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min
}

export function makePossessive(name: string): string {
  return `${name}'${name.endsWith('s') ? '' : 's'}`
}

// Return the english localized name or display name from a twitch user
export function displayName(user: HelixUser): string {
  if (user.login.toLowerCase() !== user.display_name.toLowerCase()) {
    return user.login
  } else {
    return user.display_name || user.login
  }
}

// Send a DM error message to the bot owner
export async function ownerError(
  title: string,
  err?: Error,
  msg?: Message,
  cmd?: MsgCmd,
  str?: string,
): Promise<void> {
  if (err) log.error(err.stack || err.message || err)
  if (!process.env.OWNER_ID) return
  const owner = await client.users.fetch(<Snowflake>process.env.OWNER_ID)
  if (!owner) return

  let details = '```qml\n'
  if (msg) {
    if (msg.channel.type === 'DM') {
      const author = msg.author
      const user = msg.author.username
      details += `DM: ${user} (${author.id})\n`
    } else {
      const guild = msg.guild
      if (!guild) return
      const user = msg.author.username
      details += `Guild: ${guild.name} (${guild.id})\n`
      details += `Channel: ${msg.channel.name} (${msg.channel.id})\n`
      details += `User: ${user} (${msg.author.id})\n`
    }
  }
  if (str) details += `${str}\n`
  if (cmd) {
    details += `CMD: ${cmd.name}\n`
    details += `Perms_Needed: ${JSON.stringify(cmd.info.permissions)}\n`
  }
  if (msg) details += `Content: ${msg.content}\n`
  details += '```'
  let errStr = ''
  if (err) {
    errStr = '```js\n'
    errStr += err.stack
      ? err.stack.split('\n').slice(0, 8).join('\n')
      : err.message || err
    errStr += '```'
  }
  owner
    .send(
      `${title} \`\`${new Date().toISOString()}\`\`\n${
        msg ? details : ''
      }${errStr}`,
    )
    .catch(() => {
      log.error(
        'Unable to send message to bot owner. May be blocked or DMs are disabled.',
      )
    })
}

// Get the time difference from a time to now
export function formatTimeDiff(time: string): string {
  const diff = dayjs().diff(dayjs(time))
  return formatDuration(dayjs.duration(diff))
}

// Get a long form string representation of a duration
export function formatDuration(time: Duration): string {
  let str = ''
  const years = time.years()
  if (years > 0) {
    str += `${years} year${years === 1 ? '' : 's'} `
  }
  const months = time.months()
  if (months > 0) {
    str += `${months} month${months === 1 ? '' : 's'} `
  }
  const days = time.days()
  if (days > 0) {
    str += `${days} day${days === 1 ? '' : 's'} `
  }
  str += `${time.hours()} hour${time.hours() === 1 ? '' : 's'} `
  str += `${time.minutes()} minute${time.minutes() === 1 ? '' : 's'} `
  str += `${time.seconds()} second${time.seconds() === 1 ? '' : 's'} `
  return str
}

// Get the prominent color from an image url
export async function palette(
  image: string,
): Promise<[number, number, number] | null> {
  const buffer = await axios
    .get(image, { responseType: 'arraybuffer' })
    .then(({ data }) => data)

  const pal = await Vibrant.from(buffer).getPalette()

  const lightVibrant = pal?.LightVibrant?.rgb
  const vibrant = pal?.Vibrant?.rgb
  return vibrant || lightVibrant || null
}
