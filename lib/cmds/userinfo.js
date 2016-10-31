'use strict';
exports.info = {
  name: 'userinfo',
  desc: 'Respond with info about the message author',
  usage: 'userinfo',
  aliases: [],
};

const moment = require('moment');
const utils = require('../utilities');

exports.run = (client, msg) => {
  // Gat capitalized user presence or null
  let status = msg.author.presence.status ? utils.capitalize(msg.author.presence.status) : null;
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
  str += `Name: ${msg.author.username}\n`;
  str += `Discriminator: #${msg.author.discriminator}\n`;
  // DM channel members don't have nicknames
  if (msg.channel.type === 'text') {
    str += `Nickname: ${msg.member.nickname}\n`;
  }
  str += `Bot: ${msg.author.bot}\n`;
  str += `Status: ${status}\n`;
  str += `Game: ${msg.author.presence.game}\n`;
  str += `Avatar: '${msg.author.avatar}'\n`;
  // DM channels members don't have roles
  if (msg.channel.type === 'text') {
    str += `Roles: ${roles.sort().join(', ')}\n`;
  }
  str += `\n--Joined--\n`;
  let d = moment.duration(moment() - msg.author.createdAt).asMonths().toFixed(0);
  str += `Discord: '${moment(msg.author.createdAt).utc().format()}' ` +
    `(${d} month${d === 1 ? '' : 's'})\n`;
  if (msg.channel.type === 'text') {
    d = moment.duration(moment() - msg.member.joinedAt).asMonths().toFixed(0);
    str += `${msg.guild.name.replace(/\s/g, '_')}: '${moment(msg.member.joinedAt).utc().format()}' ` +
      `(${d} month${d === 1 ? '' : 's'})\n`;
  }
  // Post string to discord in a code block
  msg.channel.sendCode('qml', str);
  utils.finish(client, msg, exports.info.name);
};
