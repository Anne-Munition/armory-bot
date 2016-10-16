'use strict';
exports.info = {
  name: 'userinfo',
  desc: 'Respond with info about the message author',
  usage: 'userinfo',
};

const moment = require('moment');
const utils = require('../utilities');

exports.run = (discord, msg) => {
  let status = msg.author.presence.status ? utils.capitalize(msg.author.presence.status) : null;
  if (status.toLowerCase() === 'dnd') {
    status = 'DND';
  }
  const roles = msg.member.roles
    .filter(x => x.id !== msg.guild.id)
    .map(x => x.name);

  let str = '--Info--\n';
  str += `ID: ${msg.author.id}\n`;
  str += `Name: ${msg.author.username}\n`;
  str += `Discriminator: #${msg.author.discriminator}\n`;
  str += `Nickname: ${msg.member.nickname}\n`;
  str += `Bot: ${msg.author.bot}\n`;
  str += `Status: ${status}\n`;
  str += `Game: ${msg.author.presence.game}\n`;
  str += `Avatar: '${msg.author.avatar}'\n`;
  str += `Roles: ${roles.join(', ')}\n\n`;
  str += `--Joined--\n`;
  str += `Discord: '${moment(msg.author.createdAt).utc().format()}' ` +
    `(${moment(msg.author.createdAt).fromNow()})\n`;
  str += `${msg.guild.name.replace(/\s/g, '_')}: '${moment(msg.member.joinedAt).utc().format()}' ` +
    `(${moment(msg.member.joinedAt).fromNow()})\n`;

  msg.channel.sendCode('qml', str);
};
