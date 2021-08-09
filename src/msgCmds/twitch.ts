import Discord from 'discord.js'
import { TwitchChannelDoc } from '../database/models/twitch_channel_model'
import TwitchChannel from '../database/services/twitch_channel_service'
import logger from '../logger'
import getChannelColor from '../twitch/getChannelColor'
import { getUsers } from '../twitch/twitch_api'
import { displayName, makePossessive, usage } from '../utilities'

export const info: CmdInfo = {
  desc: 'Manage which channels post when Twitch streams go live.',
  usage: '<add | remove | list>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
  dmAllowed: false,
  paramsRequired: true,
}

export const run: Run = async function (msg, params, cmd): Promise<void> {
  params = params.map((p) => p.toLowerCase())

  switch (params[0]) {
    case 'add':
      if (params.length < 2) {
        cmd.info.usage = `${params[0]} <twitchChannel>`
        return usage(msg, cmd)
      }
      return await addChannel(msg, params[1])
    case 'remove':
      if (params.length < 2) {
        cmd.info.usage = `${params[0]} <twitchChannel>`
        return usage(msg, cmd)
      }
      return await removeChannel(msg, params[1])
    case 'list':
      return await list(msg, params)
    default:
      return usage(msg, cmd)
  }
}

async function list(msg: Discord.Message, params: string[]): Promise<void> {
  const guild = msg.guild
  if (!guild) return

  let owner = false
  if (msg.author.id === process.env.OWNER_ID) owner = true
  const filter = owner ? {} : { guild_id: guild.id }

  let results
  try {
    results = await TwitchChannel.search(filter)
  } catch (err) {
    await msg.reply('Database error. Please try again.')
    return
  }
  logger.debug(`twitch list results: ${results.length}`)
  if (!results.length) {
    await msg.reply(
      'No Twitch channels are currently posting when they go live.',
    )
    return
  }

  let str = ''
  if (params[1] === 'all' && owner) {
    logger.debug('list all guilds')
    results.forEach((n) => {
      const channels: Discord.GuildChannel[] = []
      n.discord_channels.forEach((c) => {
        const guild = msg.client.guilds.cache.get(c.guild_id)
        if (!guild) return
        const channel = guild.channels.cache.get(c.channel_id)
        if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
      })

      channels
        .sort((a, b) => a.position - b.position)
        .map((x) => `${x.guild.name} - **#${x.name}**`)
      if (channels.length > 0) {
        str += `${getListHeader(n.display_name)}${channels.join('\n')}\n\n`
      }
    })
  } else {
    logger.debug('list this guild')
    const thisGuild = results.filter((n) => {
      const s = n.discord_channels.filter((c) => c.guild_id === guild.id)
      return !(s === null)
    })
    thisGuild.forEach((n) => {
      const channels: Discord.GuildChannel[] = []
      n.discord_channels
        .filter((c) => c.guild_id === guild.id)
        .forEach((c) => {
          const channel = guild.channels.cache.get(c.channel_id)
          if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
        })
      channels.sort((a, b) => a.position - b.position).map((x) => x.toString())
      if (channels.length > 0) {
        str += `${getListHeader(n.display_name)}${channels.join('\n')}\n\n`
      }
    })
  }
  const split = Discord.Util.splitMessage(str, { maxLength: 1800 })
  for (let i = 0; i < split.length; i++) {
    await msg.channel.send(split[i])
  }
}

async function getDocument(
  msg: Discord.Message,
  twitchChannel: string,
): Promise<TwitchChannelDoc | null | undefined> {
  try {
    return TwitchChannel.get(twitchChannel)
  } catch (err) {
    logger.error(err)
    await msg.reply('Database error. Please try again.')
  }
}

async function addChannel(
  msg: Discord.Message,
  channel: string,
): Promise<void> {
  const guild = msg.guild
  if (!guild) return
  const result = await getDocument(msg, channel)
  if (result) {
    const chan = result.discord_channels.filter(
      (x) => x.guild_id === guild.id && x.channel_id === msg.channel.id,
    )
    if (!chan.length) {
      result.discord_channels.push({
        guild_id: guild.id,
        channel_id: msg.channel.id,
      })
      try {
        await TwitchChannel.save(result)
      } catch (err) {
        logger.error(err)
        await msg.reply('There was a database error, please try again.')
        return
      }
      await msg.reply(
        `This channel will now be notified when **${result.display_name}** ` +
          `goes live on Twitch.`,
      )
    } else {
      await msg.reply(
        `This channel already gets notified when ` +
          `**${result.display_name}** goes live on Twitch.`,
      )
    }
  } else {
    const [user] = await getUsers([channel])
    if (!user) {
      await msg.reply(`**${channel}** is not a known Twitch channel.`)
      return
    }
    let color
    try {
      color = await getChannelColor(user)
    } catch (err) {
      // Do Nothing
    }
    try {
      await TwitchChannel.add(
        user,
        {
          guild_id: guild.id,
          channel_id: msg.channel.id,
        },
        color,
      )
    } catch (err) {
      logger.error(err)
      await msg.reply('Database error, please try again.')
      return
    }
    await msg.reply(
      `This channel will now be notified when **${user.display_name}** goes live on Twitch.\n\nWe have not yet synced with this Twitch channel.\nAn initial message may post within a few minutes if the channel is currently live.`,
    )
  }
}

async function removeChannel(
  msg: Discord.Message,
  twitchChannel: string,
): Promise<void> {
  const result = await getDocument(msg, twitchChannel)
  if (result) {
    let index = -1
    for (let i = 0; i < result.discord_channels.length; i++) {
      if (result.discord_channels[i].channel_id === msg.channel.id) {
        index = i
      }
    }
    if (index === -1) {
      await msg.reply(
        `This channel is not notified when **${result.display_name}** goes live on Twitch.`,
      )
      return
    }
    result.discord_channels.splice(index, 1)
    if (result.discord_channels.length === 0) {
      try {
        await TwitchChannel.remove(result.id)
        await msg.reply(
          `This channel will no longer be notified when ` +
            `**${result.display_name}** goes live on Twitch.`,
        )
      } catch (err) {
        logger.error(err)
        await msg.reply('Database error, please try again.')
      }
    } else {
      try {
        await TwitchChannel.save(result)
        await msg.reply(
          `This channel will no longer be notified when ` +
            `**${result.display_name}** goes live on Twitch.`,
        )
      } catch (err) {
        logger.error(err)
        await msg.reply('Database error, please try again.')
      }
    }
  } else {
    const [user] = await getUsers([twitchChannel])
    if (!user) {
      await msg.reply(`**${twitchChannel}** is not a known Twitch channel.`)
      return
    }
    const name = displayName(user)
    await msg.reply(
      `No channels are set to be notified when **${name}** ` +
        `goes live on Twitch.`,
    )
  }
}

function getListHeader(name: string): string {
  return `**${makePossessive(name)}** Twitch streams post to:\n`
}
