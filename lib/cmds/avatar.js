'use strict';
exports.info = {
  desc: 'Embeds the users avatar if they have one.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');
const Discord = require('discord.js');

exports.run = (client, msg) => new Promise(async(resolve, reject) => {
  // Get message authors avatar url
  const uri = msg.author.avatarURL;
  if (!uri) {
    msg.reply('You do not have a custom avatar.').then(resolve).catch(reject);
    return;
  }
  msg.channel.sendEmbed(new Discord.RichEmbed()
    .setTitle(utils.displayName(msg))
    .setColor(await utils.palette(uri))
    .setImage(uri)
  ).then(resolve).catch(reject);
});
