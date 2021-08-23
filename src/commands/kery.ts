import path from 'path'
import { assetsDir } from '../directories'

export const info: CmdInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
  defaultPermission: true,
  editablePermissions: true,
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
