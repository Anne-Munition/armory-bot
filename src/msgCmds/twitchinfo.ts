import * as twitch from '../twitch/twitch_api'
import { capitalize, displayName } from '../utilities'

export const info: CmdInfo = {
  desc: 'Get the Twitch ID for a specified user.',
  usage: '<name|id>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: true,
}

export const run: Run = async function (msg, params): Promise<void> {
  const query = params.join(' ').trim()
  const [user] = await twitch.getUsers([query])
  if (!user) {
    await msg.channel.send(
      `The Twitch channel **${params[0]}** does not exist.`,
    )
    return
  }
  const subscription = await twitch.getSubscription(user.id)

  const name = displayName(user)
  const type = `\n${capitalize(user.broadcaster_type)}`
  const sub = `\nSubscribed: **${Boolean(subscription.length)}**`
  let str = /^\d+$/.test(query)
    ? `${user.id} => **${name}**`
    : `${name} => **${user.id}**`
  if (user.broadcaster_type) str += type
  str += sub
  await msg.channel.send(str)
}
