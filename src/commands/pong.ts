export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'pong',
  description: 'Pong',
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.reply(':ping_pong:')
}
