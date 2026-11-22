import { Interaction, MessageFlags } from 'discord.js';
import { commands } from '../collections.js';
import counts from '../counts.js';
import log from '../logger.js';

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
        const content = 'There was an error while executing this command.';
        try {
          if (interaction.deferred) {
            await interaction.editReply(content);
          } else if (interaction.replied) {
            // The command already replied before failing, so add a new message instead
            await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
          } else {
            await interaction.reply({ content, flags: MessageFlags.Ephemeral });
          }
        } catch (replyErr: any) {
          log.error(`Unable to send the command error reply: ${replyErr?.message}`);
        }
      }
    }
  }
}
