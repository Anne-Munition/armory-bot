export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'avatar',
  description: "Embed the user's avatar.",
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.reply({ files: [interaction.user.displayAvatarURL()] })
}
