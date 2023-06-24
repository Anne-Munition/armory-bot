export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'avatar',
  description: "Embed the user's avatar.",
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.reply({ files: [interaction.user.displayAvatarURL()] })
}
