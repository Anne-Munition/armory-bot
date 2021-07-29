import Discord from 'discord.js'

export const info: CmdInfo = {
  desc: 'Embeds the users avatar.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  const embed = new Discord.MessageEmbed()
  embed.setImage(msg.author.displayAvatarURL())

  if (msg.member) {
    embed.setTitle(msg.member.displayName).setColor(msg.member.displayColor)
  } else {
    embed.setTitle(msg.author.username)
  }

  await msg.channel.send({ embeds: [embed] })
}
