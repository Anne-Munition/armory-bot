export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'pong',
  description: 'Pong',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.reply(':ping_pong:')
}
