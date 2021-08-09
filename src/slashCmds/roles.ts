import Discord from 'discord.js'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'roles',
  description: "List this guild's roles.",
}

export const run: SlashRun = async (interaction): Promise<void> => {
  const guild = interaction.guild
  if (!guild) throw new Error('Unable to get guild.')
  const member = interaction.member as Discord.GuildMember
  if (!member) throw new Error('Unable to get member.')
  if (!member.permissions.has('MANAGE_ROLES')) {
    await interaction.reply({
      content: "You must have 'MANAGE_ROLES' permissions to use this command.",
      ephemeral: true,
    })
  }

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
