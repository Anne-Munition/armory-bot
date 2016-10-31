'use strict';
exports.info = {
  name: 'userinfo',
  desc: 'Respond with info about the message author',
  usage: 'userinfo',
};

const moment = require('moment');
const utils = require('../utilities');

exports.run = (client, msg) => {
  let status = msg.author.presence.status ? utils.capitalize(msg.author.presence.status) : null;
  if (status === 'Dnd') {
    status = 'DND';
  }
  let roles;
  if (msg.channel.type === 'text') {
    roles = msg.member.roles
      .filter(x => x.id !== msg.guild.id)
      .map(x => x.name);
  }
  let str = '--Info--\n';
  str += `ID: ${msg.author.id}\n`;
  str += `Name: ${msg.author.username}\n`;
  str += `Discriminator: #${msg.author.discriminator}\n`;
  if (msg.channel.type === 'text') {
    str += `Nickname: ${msg.member.nickname}\n`;
  }
  str += `Bot: ${msg.author.bot}\n`;
  str += `Status: ${status}\n`;
  str += `Game: ${msg.author.presence.game}\n`;
  str += `Avatar: '${msg.author.avatar}'\n`;
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
  msg.channel.sendCode('qml', str);
};
