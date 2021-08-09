import path from 'path'
import { assetsDir } from '../directories'

export const info: SlashInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
}

export const commandData: SlashData = {
  name: 'kery',
  description: "Post the Kery's fault image.",
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.reply({
    files: [
      {
        attachment: path.join(assetsDir, 'kery.png'),
        name: 'kery.png',
      },
    ],
  })
}