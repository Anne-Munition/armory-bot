'use strict';
const config = require('../../config');

exports.info = {
  name: 'join',
  desc: 'Post a link for people to add this bot to their own Discord server',
  usage: 'join',
};

exports.run = (d, m) => {
  m.channel.sendMessage(`Follow this link to add **${d.user.username}** to your Discord server:\n` +
    `<https://discordapp.com/oauth2/authorize?&client_id=${config.bot_app_id}&scope=bot>`);
};
