'use strict';
exports.info = {
  name: 'avatar',
  desc: 'Embeds the users avatar if they have one',
  usage: 'avatar',
};

exports.run = (d, m) => {
  const uri = m.author.avatarURL;
  if (uri) {
    const name = m.guild.member(m.author).nickname || m.author.username;
    m.channel.sendFile(uri, `${m.author.id}.jpg`, `\`\`${name}\`\``);
  } else {
    m.reply('You do not have a custom avatar.');
  }
};
