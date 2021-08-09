import path from 'path'
import { assetsDir } from '../directories'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'hexagon',
  description: 'Post the hexagon gif.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, 'hexagon.gif'),
        name: 'hexagon.gif',
      },
    ],
  })
}
