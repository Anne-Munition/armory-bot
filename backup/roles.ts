export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'roles',
  description: "List this guild's roles.",
}

export const run: CmdRun = async (interaction): Promise<void> => {
  const guild = interaction.guild
  if (!guild) throw new Error('Unable to get guild.')

  const list = guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .map((role) => `\`\`${role.position}.\`\` **${role.name}**: ${role.id}`)
  await interaction.reply({
    content: list.join('\n'),
    ephemeral: true,
    allowedMentions: {
      roles: [],
    },
  })
}
