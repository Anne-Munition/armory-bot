import path from 'path'
import { guildIds } from '../config'
import { assetsDir } from '../directories'

export const info: CmdInfo = {
  global: false,
  guilds: [guildIds.armory, guildIds.dev],
}

export const structure: CmdStructure = {
  name: 'kery',
  description: "Post the Kery's fault image.",
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, 'kery.png'),
        name: 'kery.png',
      },
    ],
  })
}
