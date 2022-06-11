import humanizeDuration from 'humanize-duration'
import { Duration } from 'luxon'
import { ids } from '../config'
import Timeout from '../database/services/timeout_service'
import * as timeouts from '../timeouts'

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
}

export const structure: CmdStructure = {
  name: 'timeout',
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

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply()
  const guildId = interaction.guild?.id
  if (!guildId) throw new Error('Unable to get guild id.')

  const subCommand = interaction.options.getSubcommand(true) as 'list' | 'add' | 'remove'

  if (subCommand === 'list') {
    const activeTimeouts = await Timeout.list()
    if (!activeTimeouts.length) {
      await interaction.editReply('There are no active timeouts.')
      return
    }
    // Fetch all users to be available in cache
    for (let i = 0; i < activeTimeouts.length; i++) {
      await interaction.client.users.fetch(activeTimeouts[i].user_id)
    }
    const response = activeTimeouts.map((timeoutDoc) => {
      const user = interaction.client.users.cache.get(timeoutDoc.user_id)
      return `${user} - Expires at: ${getExpiry(timeoutDoc.expires_at)}.`
    })
    await interaction.editReply(response.join('\n'))
    return
  } else {
    // Make sure the client can update roles in the guild
    const clientUserId = interaction.client.user?.id
    if (!clientUserId) throw new Error('Unable to get the client user id.')
    const clientMember = await interaction.guild?.members.fetch(clientUserId)
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
      const unit = interaction.options.getString('unit', true) as 'minutes' | 'hours' | 'days'
      const reason = interaction.options.getString('reason')

      if (existing) {
        await interaction.editReply(
          `A timeout is already in place for ${member}.\nExpires at: ${getExpiry(
            existing.expires_at,
          )}.`,
        )
        return
      }

      const unitString = duration === 1 ? unit.slice(0, -1) : unit
      let reply = `${member} has been timed out for **${duration}** ${unitString}.`
      let auditReason = `Timed out by ${interaction.user.username} for ${duration} ${unitString}`
      if (reason) {
        reply += `\nReason: ${reason}`
        auditReason += ` for: ${reason}`
      }
      const ms = Duration.fromObject({ [unit]: duration }).toMillis()

      await timeouts.add(member, guildId, interaction.channelId, ms, targetString, auditReason)
      await interaction.editReply(reply)
    } else if (subCommand === 'remove') {
      if (!existing) {
        await interaction.editReply(`${target} is not currently under a timeout.`)
        return
      }

      await timeouts.remove(target.id, true)
      await interaction.editReply(`Manually removed timeout on ${target}.`)
    }
  }
}

function getExpiry(date: Date): string {
  const iso = new Date(date).toISOString()
  const duration = Duration.fromMillis(new Date(date).valueOf() - new Date().valueOf())
  return `\`\`${iso}\`\` - ${humanizeDuration(duration.toMillis())}`
}
