import { Snowflake } from 'discord.js'
import { msgCommands, slashCommands } from '../collections'
import commandLoader from '../command_loader'

export const info: SlashInfo = {
  global: false,
  guilds: ['140025699867164673'],
}

export const permissions: SlashPerms = [
  {
    id: <Snowflake>process.env.OWNER_ID,
    type: 'USER',
    permission: true,
  },
]

export const commandData: SlashData = {
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

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.deferReply({ ephemeral: true })

  const type = interaction.options.getString('type', true) as
    | 'msgCmd'
    | 'slashCmd'
  const command = interaction.options.getString('command', true).toLowerCase()

  // TODO: Figure out a good way to reload slash commands
  if (type === 'slashCmd') {
    await interaction.editReply(
      'Unable to do reload slash commands at this time.',
    )
    return
  }

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
