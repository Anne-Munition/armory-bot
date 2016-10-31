'use strict';
exports.info = {
  desc: 'Post a link for people to add this bot to their own Discord server',
  usage: 'join',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  msg.channel.sendMessage(`Follow this link to add **${client.user.username}** to your Discord server:\n` +
    `<https://discordapp.com/oauth2/authorize?&client_id=${client.config.bot_app_id}&scope=bot>`);
  utils.finish(client, msg, exports.info.name);
};
