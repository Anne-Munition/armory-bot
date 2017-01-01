'use strict';
exports.info = {
  desc: 'Embeds the users avatar if they have one.',
  usage: '',
  aliases: [],
};

exports.run = (client, msg) => new Promise(async(resolve, reject) => {
  // Get avatar uri or default avatar uri
  const uri = msg.author.avatarURL || msg.author.defaultAvatarURL;
  // Send response as RichEmbed
  msg.channel.sendEmbed(new client.Discord.RichEmbed()
    .setTitle(client.utils.displayName(msg))
    .setImage(uri)
  ).then(resolve).catch(reject);
});
// TODO Does this work with gif avatars?
