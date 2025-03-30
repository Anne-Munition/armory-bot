import * as app from '../app.js';
import { ids } from '../config.js';
import { ownerOnlyCommand } from '../utilities.js';

export const info: CmdInfo = {
  global: false,
  guilds: [ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'restart',
  description: 'Restart the bot client.',
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  if (await ownerOnlyCommand(interaction)) return;

  await interaction.reply({ content: ':ok_hand:', ephemeral: true });
  app.stop().finally(() => {
    process.exit(0);
  });
};
