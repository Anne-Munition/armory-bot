import { Interaction } from 'discord.js'
import { slashCommands } from '../collections'
import log from '../logger'

export default async function (interaction: Interaction): Promise<void> {
  log.debug(`received interaction: ${interaction.id}`)
  if (interaction.isCommand()) {
    const cmd = slashCommands.get(interaction.commandName)
    if (cmd) await cmd.run(interaction)
  }
}
