export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'join',
  description: 'Posts a link to join this bot to your own server.',
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.reply({
    content: `Follow this link to add **${interaction.client.user?.username}** to your Discord server:\n<https://discord.com/oauth2/authorize?&client_id=${interaction.client.application?.id}&scope=bot%20applications.commands>`,
    ephemeral: true,
  })
}
