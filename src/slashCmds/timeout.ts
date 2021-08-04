import Discord from 'discord.js'
import moment from 'moment'
import { muteRole } from '../config'
import Timeout from '../database/services/timeout_service'
import * as timeouts from '../timeouts'

export const info: SlashCmdInfo = {
  global: false,
  guilds: ['84764735832068096', '870355891789111296'],
}

export const commandData: SlashCommandData = {
  name: 'timeout',
  defaultPermission: false,
  description: 'Give a user the muted role for a duration of time.',
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
  ],
}

export const permissions: Discord.ApplicationCommandPermissionData[] = [
  {
    id: <Discord.Snowflake>process.env.OWNER_ID,
    type: 'USER',
    permission: true,
  },
]

export const run: SlashRun = async (interaction): Promise<void> => {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content: 'This command must be ran in a Guild channel.',
      ephemeral: true,
    })
    return
  }
  const perms = interaction.member.permissions as Discord.Permissions
  if (!perms.has('MANAGE_CHANNELS'))
    return interaction.reply({
      content: 'You do not have permission to run this command.',
      ephemeral: true,
    })

  const clientUserId = interaction.client.user?.id
  if (!clientUserId) throw new Error('Unable to get Client User ID')
  const clientMember = interaction.guild.members.cache.get(clientUserId)
  if (!clientMember) throw new Error('Unable to get Client Member')
  const botPerms = clientMember.permissions

  if (!botPerms.has('MANAGE_ROLES'))
    return interaction.reply({
      content: 'I am unable to edit roles in this guild.',
      ephemeral: true,
    })

  const target = interaction.options.getUser('user', true)
  const duration = interaction.options.getNumber('duration', true)
  const unit = interaction.options.getString('unit', true) as
    | 'minutes'
    | 'hours'
    | 'days'

  const member = interaction.guild.members.cache.get(target.id)
  if (!member)
    return interaction.reply({
      content: 'Unable to locate target member.',
      ephemeral: true,
    })

  const existing = await Timeout.get(target.id)
  if (existing) {
    await interaction.reply({
      content: `A timeout is already in place for ${member.user.tag}.`, // TODO: give time left?
      ephemeral: true,
    })
    return
  }

  const ms = moment.duration(duration, unit).asMilliseconds()

  await member.roles.add(muteRole)

  const targetString = `**${member.user.tag}** (${member.user.id})`
  await timeouts.add(target.id, ms, targetString)

  await interaction.reply(
    `${targetString} has been timed out for **${duration}** ${unit}(s) by ${interaction.user.tag}`,
  )
}
