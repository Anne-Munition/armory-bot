export const info: SlashInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
}

export const commandData: SlashData = {
  name: 'bed',
  description: 'Chance going to bed.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.reply('No')
}
