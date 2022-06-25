import Discord from 'discord.js'
import { ids } from '../config'
import { TwitchChannelDoc } from '../database/models/twitch_channel_model'
import TwitchChannel from '../database/services/twitch_channel_service'
import log from '../logger'
import getChannelColor from '../twitch/getChannelColor'
import { getUsers } from '../twitch/twitch_api'
import { displayName, makePossessive } from '../utilities'

export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'twitch',
  description: 'Twitch live feed channel manager.',
  defaultPermission: false,
  options: [
    {
      name: 'list',
      type: 'SUB_COMMAND',
      description: 'List the channels which post Twitch feeds.',
    },
    {
      name: 'post',
      type: 'SUB_COMMAND',
      description: 'Add or remove a channel to post Twitch feeds to.',
      options: [
        {
          name: 'action',
          type: 'STRING',
          description: 'Add or Remove',
          required: true,
          choices: [
            {
              name: 'add',
              value: 'add',
            },
            {
              name: 'remove',
              value: 'remove',
            },
          ],
        },
        {
          name: 'twitch_channel',
          type: 'STRING',
          description: 'The Twitch channel name.',
          required: true,
        },
        {
          name: 'discord_channel',
          type: 'CHANNEL',
          description: 'Optional Discord channel to post to. Defaults the this channel.',
        },
      ],
    },
  ],
}

export const run: CmdRun = async function (interaction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })
  const sub = interaction.options.getSubcommand()

  if (sub === 'list') {
    await list(interaction)
  } else if (sub === 'post') {
    const action = interaction.options.getString('action', true)
    if (action === 'add') {
      await addChannel(interaction)
    } else if (action === 'remove') {
      await removeChannel(interaction)
    }
  }
}

async function list(interaction: Discord.CommandInteraction): Promise<void> {
  const guildId = interaction.guildId
  if (!guildId) throw new Error('Unable to get guild id.')

  let results
  try {
    results = await TwitchChannel.search({ ['channels.guild_id']: guildId })
  } catch (err) {
    log.error(err)
    await interaction.editReply('Database error, please try again.')
    return
  }
  log.debug(`twitch list results: ${results.length}`)
  if (!results.length) {
    await interaction.editReply('No Twitch channels are currently posting when they go live.')
    return
  }

  let str = ''
  log.debug('list this guild')
  const thisGuildOnlyResults = results.filter((result) => {
    const s = result.channels.filter((x) => x.guild_id === guildId)
    return !(s === null)
  })
  thisGuildOnlyResults.forEach((result) => {
    const channels: Discord.GuildChannel[] = []
    result.channels
      .filter((x) => x.guild_id === guildId)
      .forEach((x) => {
        const channel = interaction.guild?.channels.cache.get(x.channel_id)
        if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
      })
    channels.sort((a, b) => a.position - b.position).map((x) => x.toString())
    if (channels.length > 0) {
      str += `**${makePossessive(result.display_name)}** Twitch streams post to:\n`
      str += `${channels.join('\n')}\n\n`
    }
  })
  const split = Discord.Util.splitMessage(str, { maxLength: 1800 })
  for (let i = 0; i < split.length; i++) {
    if (i === 0) await interaction.editReply(split[i])
    else await interaction.followUp({ content: split[i], ephemeral: true })
  }
}

async function getDocument(
  interaction: Discord.CommandInteraction,
): Promise<TwitchChannelDoc | null | undefined> {
  const channel = interaction.options.getString('twitch_channel', true)
  try {
    return TwitchChannel.get(channel)
  } catch (err) {
    log.error(err)
    await interaction.editReply('Database error, please try again.')
  }
}

function getTarget(interaction: Discord.CommandInteraction): {
  targetChannelId: string
  targetChannel: Discord.AnyChannel
} {
  const targetChannelId =
    interaction.options.getChannel('discord_channel')?.id || interaction.channelId
  const targetChannel = interaction.client.channels.cache.get(targetChannelId)
  if (!targetChannel) throw new Error('Unable to get target channel.')
  return { targetChannelId, targetChannel }
}

async function addChannel(interaction: Discord.CommandInteraction): Promise<void> {
  const guildId = interaction.guildId
  if (!guildId) throw new Error('Unable to get guild id.')

  const { targetChannelId, targetChannel } = getTarget(interaction)

  const result = await getDocument(interaction)
  if (result) {
    const channels = result.channels.filter(
      (x) => x.guild_id === guildId && x.channel_id === targetChannelId,
    )
    if (!channels.length) {
      result.channels.push({
        guild_id: guildId,
        channel_id: targetChannelId,
      })
      try {
        await TwitchChannel.save(result)
      } catch (err) {
        log.error(err)
        await interaction.editReply('Database error, please try again.')
        return
      }
      await interaction.editReply(
        `${targetChannel} will now be notified when **${result.display_name}** ` +
          `goes live on Twitch.`,
      )
    } else {
      await interaction.editReply(
        `${targetChannel} already gets notified when ` +
          `**${result.display_name}** goes live on Twitch.`,
      )
      return
    }
  } else {
    const twitchChannel = interaction.options.getString('twitch_channel', true)
    const [user] = await getUsers([twitchChannel])
    if (!user) {
      await interaction.editReply(`**${twitchChannel}** is not a known Twitch channel.`)
      return
    }
    let color
    try {
      color = await getChannelColor(user)
    } catch (err) {
      log.error(err)
    }
    try {
      await TwitchChannel.add(
        user,
        {
          guild_id: guildId,
          channel_id: targetChannelId,
        },
        color,
      )
    } catch (err) {
      log.error(err)
      await interaction.editReply('Database error, please try again.')
      return
    }
    await interaction.editReply(
      `${targetChannel} will now be notified when **${user.display_name}** goes live on Twitch.\n\nWe have not yet synced with this Twitch channel.\nAn initial message may post within a few minutes if the channel is currently live.`,
    )
  }
}

async function removeChannel(interaction: Discord.CommandInteraction): Promise<void> {
  const { targetChannelId, targetChannel } = getTarget(interaction)

  const result = await getDocument(interaction)
  if (result) {
    let index = -1
    for (let i = 0; i < result.channels.length; i++) {
      if (result.channels[i].channel_id === targetChannelId) {
        index = i
      }
    }
    if (index === -1) {
      await interaction.editReply(
        `${targetChannel} is not notified when **${result.display_name}** goes live on Twitch.`,
      )
      return
    }
    result.channels.splice(index, 1)
    if (result.channels.length === 0) {
      try {
        await TwitchChannel.remove(result.id)
        await interaction.editReply(
          `${targetChannel} will no longer be notified when ` +
            `**${result.display_name}** goes live on Twitch.`,
        )
      } catch (err) {
        log.error(err)
        await interaction.editReply('Database error, please try again.')
      }
    } else {
      try {
        await TwitchChannel.save(result)
        await interaction.editReply(
          `${targetChannel} will no longer be notified when ` +
            `**${result.display_name}** goes live on Twitch.`,
        )
      } catch (err) {
        log.error(err)
        await interaction.editReply('Database error, please try again.')
      }
    }
  } else {
    const twitchChannel = interaction.options.getString('twitch_channel', true)
    const [user] = await getUsers([twitchChannel])
    if (!user) {
      await interaction.editReply(`**${twitchChannel}** is not a known Twitch channel.`)
      return
    }
    const name = displayName(user)
    await interaction.editReply(
      `No channels are set to be notified when **${name}** ` + `goes live on Twitch.`,
    )
  }
}
