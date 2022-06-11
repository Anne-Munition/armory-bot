import * as app from '../app'
import { ids } from '../config'
import { ownerOnlyCommand } from '../utilities'

export const info: CmdInfo = {
  global: false,
  guilds: [ids.dev.guild],
}

export const structure: CmdStructure = {
  name: 'restart',
  description: 'Restart the bot client.',
}

export const run: CmdRun = async (interaction): Promise<void> => {
  if (await ownerOnlyCommand(interaction)) return

  await interaction.reply({ content: ':ok_hand:', ephemeral: true })
  app.stop().finally(() => {
    process.exit(0)
  })
}
