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
  name: 'bed',
  description: 'Chance going to bed.',
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.reply('No')
}
