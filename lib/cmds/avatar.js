'use strict';
exports.info = {
  desc: 'Embeds the users avatar.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Get avatar uri or default avatar uri
  const uri = msg.author.avatarURL || msg.author.defaultAvatarURL;
  // Send response as RichEmbed
  const embed = new client.Discord.RichEmbed()
    .setTitle(client.utils.displayName(msg))
    .setImage(uri);
  msg.channel.send({ embed }).then(resolve).catch(reject);
});
