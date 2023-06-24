import path from 'path'
import { assetsDir } from '../directories'

export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'hexagon',
  description: 'Post the hexagon gif.',
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, 'hexagon.gif'),
        name: 'hexagon.gif',
      },
    ],
  })
}
