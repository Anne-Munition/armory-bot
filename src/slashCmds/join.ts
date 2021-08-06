export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'join',
  description: 'Posts a link to join this bot to your own server.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.reply(
    `Follow this link to add **${interaction.client.user?.username}** to your Discord server:\n<https://discord.com/oauth2/authorize?&client_id=${interaction.client.application?.id}&scope=bot%20applications.commands>`,
  )
}
