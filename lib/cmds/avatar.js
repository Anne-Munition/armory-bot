'use strict';
exports.info = {
  desc: 'Embeds the users avatar if they have one.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => new Promise(async(resolve) => {
  // Get message authors avatar url
  const uri = msg.author.avatarURL;
  if (!uri) {
    msg.reply('You do not have a custom avatar.');
    resolve();
    return;
  }
  const embed = {
    title: utils.displayName(msg),
    color: await utils.palette(uri),
    image: {
      url: uri,
    },
  };
  msg.channel.sendMessage('', { embed });
  resolve();
});
