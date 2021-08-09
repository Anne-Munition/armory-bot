import Discord from 'discord.js'
import { AuditChannelDoc } from '../database/models/audit_channel_model'
import AuditChannel from '../database/services/audit_channel_service'
import log from '../logger'
import { usage } from '../utilities'

export const info: CmdInfo = {
  desc: 'Manage posting audit messages to channels.',
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
      return await addChannel(msg)
    case 'remove':
      return await removeChannel(msg)
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
  if (msg.author.id === process.env.OWNER_IDv) owner = true
  const filter = owner ? {} : { server_id: guild.id }
  let results
  try {
    results = await AuditChannel.search(filter)
  } catch (err) {
    log.error('Error getting audit channels')
    await msg.reply('Database error, please try again.')
    return
  }
  log.debug(`audit channels list length: ${results.length}`)
  if (!results.length) {
    await msg.reply('No channels currently post audit messages.')
    return
  }

  let str = ''
  if (params[1] === 'all' && owner) {
    log.debug('list all guilds')
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
        str += `Audit messages in ${guild.name} post to:\n${channels.join(
          '\n',
        )}\n\n`
      }
    }
  } else {
    log.debug('list this guild')
    const channels: Discord.GuildChannel[] = []
    results.forEach((n) => {
      const channel = guild.channels.cache.get(n.channel_id)
      if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
    })
    channels.sort((a, b) => a.position - b.position).map((x) => x.toString())
    if (channels.length > 0) {
      str += `Audit messages post to:\n${channels.join('\n')}\n\n`
    }
  }
  const split = Discord.Util.splitMessage(str, { maxLength: 1800 })
  for (let i = 0; i < split.length; i++) {
    await msg.channel.send(split[i])
  }
}

async function getAuditChannel(
  msg: Discord.Message,
): Promise<AuditChannelDoc | null | undefined> {
  try {
    return AuditChannel.getByChannel(msg.channel.id)
  } catch (err) {
    log.error('Error getting audit channel data')
    await msg.reply('Database error, please try again.')
  }
}

async function addChannel(msg: Discord.Message): Promise<void> {
  if (!msg.guild) return

  const channel = await getAuditChannel(msg)
  if (!channel) {
    try {
      await AuditChannel.save(msg.guild.id, msg.channel.id)
    } catch (err) {
      log.error('Error saving audit channel')
      await msg.reply('Database error, please try again.')
      return
    }
    await msg.reply('This channel will now post audit messages.')
  } else {
    await msg.reply('This channel already posts audit messages.')
  }
}

async function removeChannel(msg: Discord.Message): Promise<void> {
  const channel = await getAuditChannel(msg)
  if (!channel) {
    await msg.reply("This channel doesn't currently post audit messages.")
  } else {
    try {
      await AuditChannel.remove(channel.id)
    } catch (err) {
      log.error('Error removing audit channel')
      await msg.reply('Database error, please try again.')
      return
    }
    await msg.reply('This channel will no longer post audit messages.')
  }
}
