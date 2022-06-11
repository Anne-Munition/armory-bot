import * as app from '../app'
import { guildIds } from '../config'
import { ownerOnlyCommand } from '../utilities'

export const info: CmdInfo = {
  global: false,
  guilds: [guildIds.dev],
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
