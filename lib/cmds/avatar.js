'use strict';
exports.info = {
  desc: 'Embeds the users avatar if they have one.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');

exports.run = (client, msg) => {
  // Get message authors avatar url
  const uri = msg.author.avatarURL;
  if (uri) {
    let name;
    // Get the nick or username if not in a DM
    if (msg.channel.type !== 'dm') {
      name = msg.guild.member(msg.author).nickname || msg.author.username;
    }
    // Upload file. undefined is used for there to be no content header posted
    msg.channel.sendFile(uri, `${msg.author.id}.jpg`, name ? `\`\`${name}\`\`` : undefined);
  } else {
    msg.reply('You do not have a custom avatar.');
  }
  utils.finish(client, msg, exports.name);
};
