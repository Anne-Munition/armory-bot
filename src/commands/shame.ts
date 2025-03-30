import path from 'path';
import { assetsDir } from '../directories.js';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'shame',
  description: 'Post the shame nun gif.',
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, 'shame.gif'),
        name: 'shame.gif',
      },
    ],
  });
};
