import * as app from '../app'

export const info: CmdInfo = {
  global: false,
  guilds: ['140025699867164673'],
}

export const structure: CmdStructure = {
  name: 'restart',
  description: 'Restart the bot client.',
}

export const run: CmdRun = async (interaction): Promise<void> => {
  if (interaction.user.id !== process.env.OWNER_ID) {
    await interaction.reply({
      content: 'Only the bot owner has permissions to /restart.',
      ephemeral: true,
    })
    return
  }

  await interaction.reply({ content: ':ok_hand:', ephemeral: true })
  app.stop().finally(() => {
    process.exit(0)
  })
}
