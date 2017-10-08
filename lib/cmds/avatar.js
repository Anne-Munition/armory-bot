'use strict';
exports.info = {
  desc: 'Embeds the users avatar.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'ATTACH_FILES'],
};

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Get the users display name if in a guild or username
  const name = msg.member ? msg.member.displayName : msg.author.username;
  // Send the name and avatar image
  msg.channel.send(`**${name}**`,
    { files: [{ attachment: msg.author.displayAvatarURL() }] }).then(resolve).catch(reject);
});
