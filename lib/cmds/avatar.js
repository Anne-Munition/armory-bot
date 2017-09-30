'use strict';
exports.info = {
  desc: 'Embeds the users avatar.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  const embed = new client.Discord.RichEmbed()
    .setImage(msg.author.displayAvatarURL);
  // If msg.member exists we are in a guild channel
  if (msg.member) {
    embed.setTitle(msg.member.displayName)
      .setColor(msg.member.displayColor);
  } else {
    embed.setTitle(msg.author.username);
  }
  msg.channel.send({ embed }).then(resolve).catch(reject);
});
