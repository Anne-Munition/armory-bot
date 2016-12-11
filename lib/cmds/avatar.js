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
  const colors = await utils.palette(uri);
  const c = colors.Vibrant.rgb;
  const embed = {
    title: utils.displayName(msg),
    color: utils.rgbToInt(c[0], c[1], c[2]),
    image: {
      url: uri,
    },
  };
  msg.channel.sendMessage('', { embed });
  resolve();
});
