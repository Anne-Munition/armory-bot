'use strict';
const fetch = require('node-fetch');

exports.info = {
  name: 'avatar',
  desc: 'Embeds the users avatar if they have one',
  usage: 'avatar',
};

exports.run = (d, m) => {
  const uri = m.author.avatarURL;
  if (uri) {
    fetch(encodeURI(uri))
      .then(r => r.buffer())
      .then(data => {
        const name = m.guild.member(m.author).nickname || m.author.username;
        m.channel.sendFile(data, `${m.author.id}.jpg`, `\`\`${name}\`\``);
      })
      .catch(() => {
        m.reply('There was an error getting your avatar.');
      });
  } else {
    m.reply('You do not have a custom avatar.');
  }
};
