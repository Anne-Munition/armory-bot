import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import { muteRole, timeoutCmdChannel } from '../config'
import Timeout from '../database/services/timeout_service'
import * as timeouts from '../timeouts'

dayjs.extend(duration)
dayjs.extend(relativeTime)

export const info: SlashInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
}

export const permissions: SlashPerms = [
  {
    id: '84778943529365504', // Moderators - Armory
    type: 'ROLE',
    permission: true,
  },
  {
    id: '140025967044198400', // Moderators - DBKynd
    type: 'ROLE',
    permission: true,
  },
]

export const commandData: SlashData = {
  name: 'timeout',
  defaultPermission: false,
  description: 'Give a user the muted role for a duration of time.',
  options: [
    {
      name: 'list',
      type: 'SUB_COMMAND',
      description: 'List the active timeouts.',
    },
    {
      name: 'add',
      type: 'SUB_COMMAND',
      description: 'Add a timeout to a user.',
      options: [
        {
          name: 'user',
          type: 'USER',
          description: 'Who to give the muted role to.',
          required: true,
        },
        {
          name: 'duration',
          type: 'NUMBER',
          description: 'Duration user will keep the muted role.',
          required: true,
        },
        {
          name: 'unit',
          type: 'STRING',
          description: 'Unit of time.',
          required: true,
          choices: [
            {
              name: 'Minutes',
              value: 'minutes',
            },
            {
              name: 'Hours',
              value: 'hours',
            },
            {
              name: 'Days',
              value: 'days',
            },
          ],
        },
        {
          name: 'reason',
          type: 'STRING',
          description: 'Optional reason the user was timed out.',
        },
      ],
    },
    {
      name: 'remove',
      type: 'SUB_COMMAND',
      description: 'Remove a timeout from a user.',
      options: [
        {
          name: 'user',
          type: 'USER',
          description: 'Who to give the muted role to.',
          required: true,
        },
      ],
    },
  ],
}

export const run: SlashRun = async (interaction): Promise<void> => {
  const guildId = interaction.guild?.id
  if (!guildId) throw new Error('Unable to get guild id.')
  const channelId = interaction.channel?.id
  if (!channelId) throw new Error('Unable to get channel id.')
  const channel = interaction.client.channels.cache.get(channelId)
  if (!channel) throw new Error('Unable to get channel details.')
  const timeOutChannel =
    interaction.client.channels.cache.get(timeoutCmdChannel)
  if (!timeOutChannel) throw new Error('Unable to get Timeout channel details.')

  // Tell the executor that they are using the slash command in the wrong channel
  if (channelId !== timeoutCmdChannel) {
    await interaction.reply({
      content: `Please use this command in the ${timeOutChannel} channel.`,
      ephemeral: true,
    })
    return
  }

  await interaction.defer()

  const subCommand = interaction.options.getSubcommand(true) as
    | 'list'
    | 'add'
    | 'remove'

  if (subCommand === 'list') {
    const active = await Timeout.list()
    if (!active.length) {
      await interaction.editReply('There are no active timeouts.')
      return
    }
    const responseMap = active.map((timeoutDoc) => {
      const user = interaction.client.users.cache.get(timeoutDoc.discord_id)
      return `**${user?.tag}** - Expires at: ${getExpiry(
        timeoutDoc.expires_at,
      )}.`
    })
    await interaction.editReply(responseMap.join('\n'))
    return
  } else {
    // Make sure the client can update roles in the guild
    const clientUserId = interaction.client.user?.id
    if (!clientUserId) throw new Error('Unable to get the client user id.')
    const clientMember = interaction.guild?.members.cache.get(clientUserId)
    if (!clientMember) throw new Error('Unable to get the client member.')
    const botPerms = clientMember.permissions

    if (!botPerms.has('MANAGE_ROLES')) {
      await interaction.editReply('Unable to edit roles in this guild.')
      return
    }

    const target = interaction.options.getUser('user', true)
    const member = await interaction.guild?.members.fetch(target.id)
    if (!member) {
      await interaction.editReply('Unable to locate target member.')
      return
    }

    const existing = await Timeout.get(target.id)
    const targetString = `**${member.user.tag}** (${member.user.id})`

    if (subCommand === 'add') {
      const duration = interaction.options.getNumber('duration', true)
      const unit = interaction.options.getString('unit', true) as
        | 'minutes'
        | 'hours'
        | 'days'
      const reason = interaction.options.getString('reason')

      if (existing) {
        await interaction.editReply(
          `A timeout is already in place for **${
            member.user.tag
          }**.\nExpires at: ${getExpiry(existing.expires_at)}.`,
        )
        return
      }

      const ms = dayjs.duration(duration, unit).asMilliseconds()
      await timeouts.add(target.id, guildId, ms, targetString)
      await member.roles.add(muteRole)

      let reply = `${targetString} has been timed out for **${duration}** ${unit}(s)`
      if (reason) reply += `\nReason: ${reason}`
      await interaction.editReply(reply)
    } else if (subCommand === 'remove') {
      if (!existing) {
        await interaction.editReply(
          `**${target.tag}** is not currently under a timeout.`,
        )
        return
      }

      await timeouts.remove(target.id, true)
      await interaction.editReply(
        `Manually removed timeout on ${targetString}.`,
      )
    }
  }
}

function getExpiry(date: Date): string {
  const iso = new Date(date).toISOString()
  const duration = dayjs.duration(
    new Date(date).valueOf() - new Date().valueOf(),
  )
  const relative = duration.humanize(true)
  return `\`\`${iso}\`\` - ${relative}`
}
