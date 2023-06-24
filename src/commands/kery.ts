import path from 'path'
import { ids } from '../config'
import { assetsDir } from '../directories'

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
}

export const structure: CmdStructure = {
  name: 'kery',
  description: "Post the Kery's fault image.",
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, 'kery.png'),
        name: 'kery.png',
      },
    ],
  })
}
