import Discord from 'discord.js'
import { NotificationChannelDoc } from '../database/models/notification_channel_model'
import NotificationChannel from '../database/services/notification_channel_service'
import log from '../logger'

// TODO Merge with other managers?

export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'notify',
  description: 'Discord notification channel manager.',
  options: [
    {
      name: 'list',
      type: 'SUB_COMMAND',
      description: 'List the channels which post Discord notifications.',
      options: [
        {
          name: 'all',
          type: 'BOOLEAN',
          description: 'Bot Owner Only.',
        },
      ],
    },
    {
      name: 'post',
      type: 'SUB_COMMAND',
      description: 'Add or remove a channel to post Discord notifications to.',
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
          name: 'channel',
          type: 'CHANNEL',
          description:
            'Optional Discord channel to post to. Defaults the this channel.',
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

async function list(interaction: Discord.CommandInteraction) {
  const guildId = interaction.guildId
  if (!guildId) throw new Error('Unable to get guild id.')

  const listAll =
    interaction.options.getBoolean('all') &&
    interaction.user.id === process.env.OWNER_ID

  const filter = listAll ? {} : { guild_id: guildId }

  let results
  try {
    results = await NotificationChannel.search(filter)
  } catch (err) {
    log.error(err)
    await interaction.editReply('Database error, please try again.')
    return
  }
  log.debug(`notification channel results: ${results.length}`)
  if (!results.length) {
    await interaction.editReply(
      'No channels currently post notification messages.',
    )
    return
  }

  let str = ''
  if (listAll) {
    log.debug('list all guilds')
    const mapped: { [key: string]: string[] } = {}
    results.forEach((result) => {
      if (mapped[result.guild_id]) {
        mapped[result.guild_id].push(result.channel_id)
      } else {
        mapped[result.guild_id] = [result.channel_id]
      }
    })

    for (const id in mapped) {
      const channels: Discord.GuildChannel[] = []
      const guild = interaction.client.guilds.cache.get(id)
      if (!guild) continue
      mapped[id].forEach((channelId) => {
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
    log.debug('list this guild')
    const channels: Discord.GuildChannel[] = []
    results.forEach((result) => {
      const channel = interaction.guild?.channels.cache.get(result.channel_id)
      if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
    })
    channels.sort((a, b) => a.position - b.position).map((x) => x.toString())
    if (channels.length > 0) {
      str += `Notifications post to:\n${channels.join('\n')}\n\n`
    }
  }
  const split = Discord.Util.splitMessage(str, { maxLength: 1800 })
  for (let i = 0; i < split.length; i++) {
    if (i === 0) await interaction.editReply(split[i])
    else await interaction.followUp({ content: split[i], ephemeral: true })
  }
}

async function getNotificationDoc(
  interaction: Discord.CommandInteraction,
  targetId: string,
): Promise<NotificationChannelDoc | null | undefined> {
  try {
    return NotificationChannel.getByChannel(targetId)
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
    interaction.options.getChannel('channel')?.id || interaction.channelId
  const targetChannel = interaction.client.channels.cache.get(targetChannelId)
  if (!targetChannel) throw new Error('Unable to get target channel.')
  return { targetChannelId, targetChannel }
}

async function addChannel(
  interaction: Discord.CommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId
  if (!guildId) throw new Error('Unable to get guild id.')

  const { targetChannelId, targetChannel } = getTarget(interaction)

  const channel = await getNotificationDoc(interaction, targetChannelId)
  if (!channel) {
    try {
      await NotificationChannel.save(guildId, targetChannelId)
    } catch (err) {
      log.error(err)
      await interaction.editReply('Database error, please try again.')
      return
    }
    await interaction.editReply(
      `${targetChannel} will now post notification messages.`,
    )
  } else {
    await interaction.editReply(
      `${targetChannel} already posts notification messages.`,
    )
  }
}

async function removeChannel(interaction: Discord.CommandInteraction) {
  const { targetChannelId, targetChannel } = getTarget(interaction)

  const channel = await getNotificationDoc(interaction, targetChannelId)
  if (!channel) {
    await interaction.editReply(
      `${targetChannel} doesn't currently post notification messages.`,
    )
  } else {
    try {
      await NotificationChannel.remove(channel.id)
    } catch (err) {
      log.error(err)
      await interaction.editReply('Database error, please try again.')
      return
    }
    await interaction.editReply(
      `${targetChannel} will no longer post notification messages.`,
    )
  }
}
