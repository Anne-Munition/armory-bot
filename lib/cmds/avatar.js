'use strict'
exports.info = {
  desc: 'Embeds the users avatar.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
}

exports.run = (client, msg) =>
  new Promise((resolve, reject) => {
    // Create new embed
    const embed = new client.Discord.MessageEmbed().setImage(
      msg.author.displayAvatarURL(),
    )
    if (msg.member) {
      // If msg.member exists we are in a guild channel
      embed.setTitle(msg.member.displayName).setColor(msg.member.displayColor)
    } else {
      // We are in a dm channel
      embed.setTitle(msg.author.username)
    }
    msg.channel.send({ embed }).then(resolve).catch(reject)
  })
