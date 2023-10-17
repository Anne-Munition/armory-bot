import { Interaction } from 'discord.js';
import { commands } from '../collections';
import counts from '../counts';
import log from '../logger';

export default async function (interaction: Interaction): Promise<void> {
  log.debug(`received interaction: ${interaction.id}`);
  if (interaction.isCommand()) {
    const command = commands.get(interaction.commandName);
    if (command && interaction.isChatInputCommand()) {
      try {
        await command.cmd.run(interaction);
        counts.increment('commandsRan');
      } catch (err: any) {
        log.error(err.stack || err.message || err);
        if (interaction.deferred) {
          await interaction.editReply('There was an error while executing this command.');
        } else {
          await interaction.reply({
            content: 'There was an error while executing this command.',
            ephemeral: true,
          });
        }
      }
    }
  }
}
