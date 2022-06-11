import axios from 'axios'
import { CommandInteraction, Message, Snowflake } from 'discord.js'
import { DateTime, Duration } from 'luxon'
import Vibrant from 'node-vibrant'
import client from './discord'
import log from './logger'

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
  cmd?: Cmd,
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
    details += `CMD: ${cmd.structure.name}\n`
    // details += `Perms_Needed: ${JSON.stringify(cmd.info.permissions)}\n`
  }
  if (msg) details += `Content: ${msg.content}\n`
  details += '```'
  let errStr = ''
  if (err) {
    errStr = '```js\n'
    errStr += err.stack ? err.stack.split('\n').slice(0, 8).join('\n') : err.message || err
    errStr += '```'
  }
  owner
    .send(`${title} \`\`${new Date().toISOString()}\`\`\n${msg ? details : ''}${errStr}`)
    .catch(() => {
      log.error('Unable to send message to bot owner. May be blocked or DMs are disabled.')
    })
}

// Get the time difference from a time to now
export function formatTimeDiff(time: string): string {
  const diff = DateTime.now().diff(DateTime.fromISO(time))
  return formatDuration(diff)
}

// Get a long form string representation of a duration
export function formatDuration(duration: Duration): string {
  const time = duration.shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds').toObject()
  let str = ''
  const years = time.years || 0
  const months = time.months || 0
  const days = time.days || 0
  const hours = time.hours || 0
  const minutes = time.minutes || 0
  const seconds = Math.floor(time.seconds || 0)
  if (years > 0) str += `${years} year${years === 1 ? '' : 's'} `
  if (months > 0) str += `${months} month${months === 1 ? '' : 's'} `
  if (days > 0) str += `${days} day${days === 1 ? '' : 's'} `
  str += `${hours} hour${hours === 1 ? '' : 's'} `
  str += `${minutes} minute${minutes === 1 ? '' : 's'} `
  str += `${seconds} second${seconds === 1 ? '' : 's'} `
  return str
}

// Get the prominent color from an image url
export async function palette(image: string): Promise<[number, number, number] | null> {
  const buffer = await axios.get(image, { responseType: 'arraybuffer' }).then(({ data }) => data)

  const palette = await Vibrant.from(buffer).getPalette()

  const vibrant = palette?.Vibrant?.rgb
  const lightVibrant = palette?.LightVibrant?.rgb
  return vibrant || lightVibrant || null
}

// Do nothing function for .catch blocks
export function ignore(): void {
  // Do Nothing
}

// Get an array of [0,1] numbers from Random.org
// https://api.random.org/json-rpc/4/basic
export async function getRandomDecimals(count: number): Promise<number[]> {
  const url = 'https://api.random.org/json-rpc/4/invoke'
  const id = getRandomInt(9999, 999999)
  const body = {
    jsonrpc: '2.0',
    method: 'generateDecimalFractions',
    params: {
      apiKey: process.env.RANDOM_ORG_KEY,
      n: count,
      decimalPlaces: 8,
    },
    id: id,
  }
  return axios.post(url, body).then(({ data }: { data: SignedDecimalFraction }) => {
    if (data.id !== id) throw new Error('Random.org ID mismatch')
    return data.result.random.data
  })
}

// Check if interaction was made from bot owner
export async function ownerOnlyCommand(interaction: CommandInteraction): Promise<boolean> {
  if (interaction.user.id !== process.env.OWNER_ID) {
    await interaction.reply({
      content: 'Only the bot owner has permissions to use this command.',
      ephemeral: true,
    })
    return true
  }
  return false
}
