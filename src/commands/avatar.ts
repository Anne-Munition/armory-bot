export const info: CmdInfo = {
  global: true,
  defaultPermission: true,
  editablePermissions: true,
}

export const structure: CmdStructure = {
  name: 'avatar',
  description: "Embed the user's avatar.",
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.reply({ files: [interaction.user.displayAvatarURL()] })
}
