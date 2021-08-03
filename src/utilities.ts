import axios from 'axios'
import { Message, Snowflake } from 'discord.js'
import moment, { Duration } from 'moment'
import Vibrant from 'node-vibrant'
import client from './discord'
import log from './logger'

export function capitalize(word: string): string {
  return word.replace(/\b\w/g, (l) => l.toUpperCase())
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min
}

export async function usage(msg: Message, cmd: MsgCmd): Promise<void> {
  let str = `Usage: \`\`${cmd.prefixUsed}${cmd.nameUsed} ${cmd.info.usage}\`\``
  if (cmd.nameUsed === 'help') {
    str += `\nRun \`\`${cmd.prefixUsed}cmds\`\` to see a list of commands`
  }
  await msg.reply(str)
}

export async function dmDenied(msg: Message, cmd: MsgCmd): Promise<void> {
  await msg.reply(
    `Unable to run command **${cmd.nameUsed}** from a DM channel.`,
  )
}

export function displayName(user: HelixUser): string {
  if (user.login.toLowerCase() !== user.display_name.toLowerCase()) {
    return user.login
  } else {
    return user.display_name || user.login
  }
}

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
  if (str) {
    details += `${str}\n`
  }
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
        'Unable to send message to bot owner. May be blocked or DMs are disabled in general',
      )
    })
}

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

export function formatTimeDiff(time: string): string {
  const diff = moment().diff(moment(time))
  return formatDuration(moment.duration(diff))
}

export async function palette(
  image: string,
): Promise<[number, number, number] | null> {
  return new Promise(async (resolve, reject) => {
    const buffer = await axios
      .get(image, { responseType: 'arraybuffer' })
      .then(({ data }) => data)

    await Vibrant.from(buffer).getPalette((err, palette) => {
      if (err) {
        reject(err)
      }
      const lightVibrant = palette?.LightVibrant?.rgb
      const vibrant = palette?.Vibrant?.rgb
      resolve(vibrant || lightVibrant || null)
    })
  })
}

export function makePossessive(name: string): string {
  return `${name}'${name.endsWith('s') ? '' : 's'}`
}
