import Discord from 'discord.js'
import { commands } from '../collections'

export const info: CmdInfo = {
  global: true,
  defaultPermission: true,
  editablePermissions: true,
}

const commandNames = [...commands.keys()]
const choices = commandNames.filter((x) => {
  const cmd = commands.get(x)
  if (!cmd) return false
  return cmd.cmd.info.editablePermissions
})
choices.push('permissions')
const sortedChoices = choices
  .sort((a, b) => {
    if (a < b) return -1
    if (a > b) return 1
    return 0
  })
  .map((x) => {
    return {
      name: x,
      value: x,
    }
  })

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
          choices: sortedChoices,
        },
      ],
    },
  ],
}

export const run: CmdRun = async (interaction): Promise<void> => {
  const sub = interaction.options.getSubcommand()
  if (sub === 'list') {
    const name = interaction.options.getString('command', true)
    console.log(name)
    const command = commands.get(name)
    if (!command) throw new Error('Command not found')
    console.log(command.id)
    const perms = await interaction.guild?.commands.permissions.fetch({
      command: command.id,
    })
    const codeBlock = Discord.Formatters.codeBlock(
      'js',
      JSON.stringify(perms, null, 2),
    )
    await interaction.reply(codeBlock)
  }
}
