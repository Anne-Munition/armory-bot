import Discord from 'discord.js'
import { commands } from '../collections'
import CmdPerms from '../database/services/command_permission_service'

export const info: CmdInfo = {
  global: true,
  defaultPermission: true,
  editablePermissions: true,
}

const editableCommands = Object.keys(commands.keys())
if (info.editablePermissions) editableCommands.push('permissions')
const choices = editableCommands
  .sort((a, b) => {
    if (a > b) return -1
    if (a > b) return 1
    return 0
  })
  .map((x) => {
    return {
      name: x,
      value: x,
    }
  })

console.log(editableCommands)

export const structure: CmdStructure = {
  name: 'permissions',
  description: 'Command permission overwrites.',
  options: [
    {
      name: 'list',
      type: 'SUB_COMMAND',
      description: 'List the current permissions for a command.',
      options: [
        {
          name: 'command',
          type: 'STRING',
          description: 'The command to list the permissions for.',
          required: true,
          choices,
        },
      ],
    },
  ],
}

export const run: CmdRun = async (interaction): Promise<void> => {
  if (!interaction.guildId) throw new Error('No Guild ID')
  const sub = interaction.options.getSubcommand()
  if (sub === 'list') {
    const name = interaction.options.getString('command', true)
    const command = commands.get(name)
    if (!command) {
      await interaction.reply({
        content: 'Unable to get that command data.',
        ephemeral: true,
      })
      return
    }
    const perms = await CmdPerms.getByGuildId(interaction.guildId)
    const codeBlock = Discord.Formatters.codeBlock(
      'js',
      JSON.stringify(
        perms.map((x) => x.permission),
        null,
        2,
      ),
    )
    await interaction.reply(codeBlock)
  }
}
