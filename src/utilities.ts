import { Message, Snowflake } from 'discord.js'
import client from './discord'
import log from './logger'

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min
}

export async function usage(msg: Message, cmd: Cmd): Promise<void> {
  let str = `Usage: \`\`${cmd.prefixUsed}${cmd.nameUsed} ${cmd.info.usage}\`\``
  if (cmd.nameUsed === 'help') {
    str += `\nRun \`\`${cmd.prefixUsed}cmds\`\` to see a list of commands`
  }
  await msg.reply(str)
}

export async function dmDenied(msg: Message, cmd: Cmd): Promise<void> {
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
