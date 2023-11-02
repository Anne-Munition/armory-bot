import path from 'path';
import { ids } from '../config';
import { assetsDir } from '../directories';

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'kery',
  description: "Post the Kery's fault image.",
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const image = Math.random() < 0.5 ? 'kery.png' : 'kery2.png';
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, image),
        name: 'kery.png',
      },
    ],
  });
};
