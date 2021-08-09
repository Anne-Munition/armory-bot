import { Interaction } from 'discord.js'
import { slashCommands } from '../collections'
import counts from '../counts'
import log from '../logger'

export default async function (interaction: Interaction): Promise<void> {
  log.debug(`received interaction: ${interaction.id}`)
  if (interaction.isCommand()) {
    const command = slashCommands.get(interaction.commandName)
    if (command) {
      try {
        await command.run(interaction)
        counts.increment('slashCommandsRan')
      } catch (err) {
        log.error(err.stack || err.message || err)
        if (interaction.deferred) {
          await interaction.editReply(
            'There was an error while executing this command.',
          )
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command.',
            ephemeral: true,
          })
        }
      }
    }
  }
}
