export const info: CmdInfo = {
  desc: 'Print out a list of role to role ids.',
  usage: '',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
  dmAllowed: false,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  if (!msg.guild) return
  const array = msg.guild.roles.cache
    .array()
    .sort((a, b) => b.position - a.position)
    .map((role) => `\`\`${role.position}.\`\` **${role.name}**: ${role.id}`)
  await msg.channel.send(array.join('\n'))
}
