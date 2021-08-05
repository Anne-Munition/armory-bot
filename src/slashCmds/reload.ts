import Discord from 'discord.js'
import { msgCommands, slashCommands } from '../collections'
import commandLoader from '../command_loader'

export const info: SlashCmdInfo = {
  global: false,
  guilds: ['140025699867164673'],
}

export const commandData: SlashCommandData = {
  name: 'reload',
  description: 'Reload a command.',
  options: [
    {
      name: 'type',
      type: 'STRING',
      description: 'Command type.',
      required: true,
      choices: [
        {
          name: 'msgCmd',
          value: 'msgCmd',
        },
        {
          name: 'slashCmd',
          value: 'slashCmd',
        },
      ],
    },
    {
      name: 'command',
      type: 'STRING',
      description: 'Command name.',
      required: true,
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
  await interaction.defer({ ephemeral: true })

  const type = interaction.options.getString('type', true) as
    | 'msgCmd'
    | 'slashCmd'
  const command = interaction.options.getString('command', true).toLowerCase()

  if (command === 'all') {
    if (type === 'msgCmd') {
      await commandLoader.loadAllMsgCmds()
    } else {
      await commandLoader.loadAllSlashCommands()
    }
    await interaction.editReply(`Reloaded all ${type}s`)
    return
  }

  const collection = type === 'msgCmd' ? msgCommands : slashCommands
  const cmd = collection.get(command)
  if (!cmd) {
    await interaction.editReply(`No ${type} named ${command} was found.`)
    return
  }

  if (type === 'msgCmd') {
    await commandLoader.loadMsgCommand(command)
  } else {
    await commandLoader.loadSlashCommand(command)
  }
  await interaction.editReply(`Reloaded ${type}: ${command}`)
}
