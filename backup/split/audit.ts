import Discord, { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import { AuditChannelDoc } from '../../src/database/models/audit_channel_model'
import AuditChannel from '../../src/database/services/audit_channel_service'
import log from '../../src/logger'

export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'audit',
  description: 'Discord audit channel manager.',
  options: [
    {
      name: 'list',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'List the channels which post Discord audits.',
    },
    {
      name: 'post',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Add or remove a channel to post Discord audits to.',
      options: [
        {
          name: 'action',
          type: ApplicationCommandOptionType.String,
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
          type: ApplicationCommandOptionType.Channel,
          description: 'Optional Discord channel to post to. Defaults to this channel.',
        },
      ],
    },
  ],
}

export const run: ChatCmdRun = async function (interaction): Promise<void> {
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

async function list(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId
  if (!guildId) throw new Error('Unable to get guild id.')

  let results
  try {
    results = await AuditChannel.search({ guild_id: guildId })
  } catch (err) {
    log.error(err)
    await interaction.editReply('Database error, please try again.')
    return
  }
  log.debug(`audit channel results: ${results.length}`)
  if (!results.length) {
    await interaction.editReply('No channels currently post audit messages.')
    return
  }

  let str = ''
  const channels: Discord.GuildChannel[] = []
  results.forEach((n) => {
    const channel = interaction.guild?.channels.cache.get(n.channel_id)
    if (channel && channel.type === ChannelType.GuildText) channels.push(channel)
  })
  channels.sort((a, b) => a.position - b.position).map((x) => x.toString())
  if (channels.length > 0) {
    str += `Audit messages post to:\n${channels.join('\n')}\n\n`
  }
  const split = Discord.Util.splitMessage(str, { maxLength: 1800 })
  for (let i = 0; i < split.length; i++) {
    if (i === 0) await interaction.editReply(split[i])
    else await interaction.followUp({ content: split[i], ephemeral: true })
  }
}

async function getAuditChannel(
  interaction: Discord.ChatInputCommandInteraction,
  targetId: string,
): Promise<AuditChannelDoc | null | undefined> {
  try {
    return AuditChannel.getByChannel(targetId)
  } catch (err) {
    log.error(err)
    await interaction.editReply('Database error, please try again.')
  }
}

function getTarget(interaction: Discord.ChatInputCommandInteraction): {
  targetChannelId: string
  targetChannel: Discord.Channel
} {
  const targetChannelId = interaction.options.getChannel('channel')?.id || interaction.channelId
  const targetChannel = interaction.client.channels.cache.get(targetChannelId)
  if (!targetChannel) throw new Error('Unable to get target channel.')
  return { targetChannelId, targetChannel }
}

async function addChannel(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId
  if (!guildId) throw new Error('Unable to get guild id.')

  const { targetChannelId, targetChannel } = getTarget(interaction)

  const channel = await getAuditChannel(interaction, targetChannelId)
  if (!channel) {
    try {
      await AuditChannel.save(guildId, targetChannelId)
    } catch (err) {
      log.error(err)
      await interaction.editReply('Database error, please try again.')
      return
    }
    await interaction.editReply(`${targetChannel} will now post audit messages.`)
  } else {
    await interaction.editReply(`${targetChannel} already posts audit messages.`)
  }
}

async function removeChannel(interaction: Discord.ChatInputCommandInteraction): Promise<void> {
  const { targetChannelId, targetChannel } = getTarget(interaction)

  const channel = await getAuditChannel(interaction, targetChannelId)
  if (!channel) {
    await interaction.editReply(`${targetChannel} doesn't currently post audit messages.`)
  } else {
    try {
      await AuditChannel.remove(channel.id)
    } catch (err) {
      log.error(err)
      await interaction.editReply('Database error, please try again.')
      return
    }
    await interaction.editReply(`${targetChannel} will no longer post audit messages.`)
  }
}
