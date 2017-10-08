'use strict';
exports.info = {
  desc: 'Get information about the message author.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

const moment = require('moment');

exports.run = (client, msg) => new Promise((resolve, reject) => {
  // Gat capitalized user presence or null
  let status = msg.author.presence.status ? client.utils.capitalize(msg.author.presence.status) : null;
  // If presence is DND caps all
  if (status === 'Dnd') {
    status = 'DND';
  }
  let roles;
  // Get the message members roles if message was in text channel
  if (msg.channel.type === 'text') {
    roles = msg.member.roles
      .filter(x => x.id !== msg.guild.id)
      .map(x => x.name);
  }
  // Build string to post to Discord
  let str = '--Info--\n';
  str += `ID: ${msg.author.id}\n`;
  // DM channel members don't have nicknames
  if (msg.channel.type === 'text') {
    str += `Nickname: ${msg.member.nickname}\n`;
  }
  str += `Status: ${status}\n`;
  str += `Game: ${msg.author.presence.game ? msg.author.presence.game.name : null}\n`;
  str += `Avatar: '${msg.author.avatar}'\n`;
  // DM channels members don't have roles
  if (msg.channel.type === 'text') {
    str += `Roles: ${roles.sort().join(', ')}\n`;
  }
  str += `\n--Joined--\n`;
  let d = moment.duration(moment() - msg.author.createdAt).asMonths().toFixed(0);
  str += `Discord_App: '${moment(msg.author.createdAt).utc().format()}' ` +
    `(${d}+ month${d === 1 ? '' : 's'})\n`;
  if (msg.channel.type === 'text') {
    d = moment.duration(moment() - msg.member.joinedAt).asMonths().toFixed(0);
    str += `This_Server: '${moment(msg.member.joinedAt).utc().format()}' ` +
      `(${d}+ month${d === 1 ? '' : 's'})\n`;
  }
  str = `\`\`\`qml\n${str}\`\`\``;
  const embed = new client.Discord.MessageEmbed()
    .setTitle(`${msg.author.username} #${msg.author.discriminator}`)
    .setDescription(str)
    .setThumbnail(msg.author.displayAvatarURL());
  msg.channel.send({ embed }).then(resolve).catch(reject);
});
