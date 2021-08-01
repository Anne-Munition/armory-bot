import { Client } from 'discord.js'
import { slashCommands } from '../collections'

export default async function (client: Client): Promise<void> {
  const globalCmds = slashCommands.filter((x) => x.info.global)
  const guildCmds = slashCommands.filter((x) => !x.info.global)

  if (process.env.NODE_ENV === 'production') {
    await client.application?.commands.set(globalCmds.map((x) => x.commandData))
  }

  for (const [, guild] of client.guilds.cache) {
    let commandsToAdd = guildCmds.filter((x) => {
      if (!x.info.guilds) return false
      return x.info.guilds.includes(guild.id)
    })
    // Add global configs to guild configs in development
    if (process.env.NODE_ENV !== 'production') {
      commandsToAdd = commandsToAdd.concat(globalCmds)
    }

    if (commandsToAdd.size !== 0) {
      const addedCommands = await guild.commands.set(
        commandsToAdd.map((x) => x.commandData),
      )

      // Set any permissions for those that have them
      for (const [, command] of addedCommands) {
        const slashCommand = slashCommands.get(command.name)
        if (!slashCommand || !slashCommand.permissions) continue
        await command.permissions.set({ permissions: slashCommand.permissions })
      }
    }
  }
}
