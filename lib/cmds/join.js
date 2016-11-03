'use strict';
exports.info = {
  desc: 'Post a link for people to join this bot to their own Discord server.',
  usage: '',
  aliases: [],
};

const config = require('../../config');
const utils = require('../utilities');

exports.run = (client, msg) => {
  msg.channel.sendMessage(`Follow this link to add **${client.user.username}** to your Discord server:\n` +
    `<https://discordapp.com/oauth2/authorize?&client_id=${config.bot_app_id}&scope=bot>`);
  utils.finish(msg, exports.name);
};
