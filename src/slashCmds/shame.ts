import path from 'path'
import { assetsDir } from '../directories'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'shame',
  description: 'Post the shame nun gif.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, 'shame.gif'),
        name: 'shame.gif',
      },
    ],
  })
}
