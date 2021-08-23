export const info: CmdInfo = {
  global: true,
  defaultPermission: true,
  editablePermissions: true,
}

export const structure: CmdStructure = {
  name: 'pong',
  description: 'Pong',
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.reply(':ping_pong:')
}
