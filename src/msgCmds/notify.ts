import Discord from 'discord.js'
import { NotificationChannelDoc } from '../database/models/notification_channel_model'
import NotificationChannel from '../database/services/notification_channel_service'
import logger from '../logger'
import { usage } from '../utilities'

export const info: CmdInfo = {
  desc: 'Manage posting notification messages to channels.',
  usage: '<add | remove | list>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
  dmAllowed: false,
  paramsRequired: true,
}

// <add | remove | list> channels to post join / part messages to
export const run: Run = async function (msg, params, cmd): Promise<void> {
  params = params.map((p) => p.toLowerCase())

  switch (params[0]) {
    case 'add':
      return await addChannel(msg)
    case 'remove':
      return await removeChannel(msg)
    case 'list':
      return await list(msg, params)
    default:
      return usage(msg, cmd)
  }
}

async function list(msg: Discord.Message, params: string[]) {
  const guild = msg.guild
  if (!guild) return

  let owner = false
  if (msg.author.id === process.env.OWNER_ID) owner = true
  const filter = owner ? {} : { guild_id: guild.id }
  let results
  try {
    results = await NotificationChannel.search(filter)
  } catch (err) {
    logger.error('Error getting notification channels')
    await msg.reply('Database error, please try again.')
    return
  }
  logger.debug(`notification channels list ${results.length}`)
  if (!results.length) {
    await msg.reply('No channels currently post notification messages.')
    return
  }

  let str = ''
  if (params[1] === 'all' && owner) {
    logger.debug('list all guilds')
    const mapped: { [key: string]: string[] } = {}
    results.forEach((n) => {
      if (mapped[n.guild_id]) {
        mapped[n.guild_id].push(n.channel_id)
      } else {
        mapped[n.guild_id] = [n.channel_id]
      }
    })

    for (const guildId in mapped) {
      const channels: Discord.GuildChannel[] = []
      const guild = msg.client.guilds.cache.get(guildId)
      if (!guild) return
      mapped[guildId].forEach((channelId) => {
        const channel = guild.channels.cache.get(channelId)
        if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
      })
      channels
        .sort((a, b) => a.position - b.position)
        .map((x) => `${x.guild.name} - **#${x.name}**`)
      if (channels.length > 0) {
        str += `Notifications in ${guild.name} post to:\n${channels.join(
          '\n',
        )}\n\n`
      }
    }
  } else {
    logger.debug('list this guild')
    const channels: Discord.GuildChannel[] = []
    results.forEach((n) => {
      const channel = guild.channels.cache.get(n.channel_id)
      if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
    })
    channels.sort((a, b) => a.position - b.position).map((x) => x.toString())
    if (channels.length > 0) {
      str += `Notifications post to:\n${channels.join('\n')}\n\n`
    }
  }
  const split = Discord.Util.splitMessage(str, { maxLength: 1800 })
  for (let i = 0; i < split.length; i++) {
    await msg.channel.send(split[i])
  }
}

async function getNotificationDoc(
  msg: Discord.Message,
): Promise<NotificationChannelDoc | null | undefined> {
  try {
    return NotificationChannel.getByChannel(msg.channel.id)
  } catch (err) {
    logger.error('Error getting notification channel data')
    await msg.channel.send('Database error, please try again.')
  }
}

async function addChannel(msg: Discord.Message): Promise<void> {
  if (!msg.guild) return
  const channel = await getNotificationDoc(msg)
  if (!channel) {
    try {
      await NotificationChannel.save(msg.guild.id, msg.channel.id)
    } catch (e) {
      logger.error('Error Saving notification channel to the mongoDB')
      await msg.reply('Database error, please try again.')
      return
    }
    await msg.reply('This channel will now post notification messages.')
  } else {
    await msg.reply('This channel already posts notification messages.')
  }
}

async function removeChannel(msg: Discord.Message) {
  const channel = await getNotificationDoc(msg)
  if (!channel) {
    await msg.reply(
      "This channel doesn't currently post notification messages.",
    )
  } else {
    try {
      await NotificationChannel.remove(channel.id)
    } catch (e) {
      logger.error('Error removing notification channel from the mongoDB')
      await msg.reply('There was a database error. Please try again.')
      return
    }
    await msg.reply('This channel will no longer post notification messages.')
  }
}
