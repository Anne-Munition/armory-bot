'use strict';
const logger = require('winston');
const config = require('../config');
const moment = require('moment');

module.exports = {

  guildCreate: (client, guild) => {
    const str = `${client.user.username} joined Discord guild: **${guild.name}** ` +
      `- Owner: **${guild.owner.user.username}** #${guild.owner.user.discriminator}`;
    logger.info(str);
    const owner = client.users.get(config.owner_id);
    if (owner) owner.send(str);
  },

  guildDelete: (client, guild) => {
    const str = `${client.user.username} parted Discord guild: **${guild.name}** ` +
      `-  Owner: **${guild.owner.user.username}** #${guild.owner.user.discriminator}`;
    logger.info(str);
    const owner = client.users.get(config.owner_id);
    if (owner) owner.send(str);
  },

  guildMemberAdd: async(client, member) => {
    const embed = new client.Discord.MessageEmbed()
      .setColor([30, 210, 30])
      .setAuthor(`${member.user.username}#${member.user.discriminator} (${member.user.id})`, member.user.avatarURL)
      .setFooter('User Joined')
      .setTimestamp(moment());
    try {
      const channels = await client.mongo.welcomeChannels.find({ server_id: member.guild.id });
      logger.debug(`Posting welcome messages in (${channels.length}) registered channels`);
      channels.forEach(c => {
        const channel = member.guild.channels.get(c.channel_id);
        if (channel) {
          if (!channel.permissionsFor(client.user).has(['SEND_MESSAGES', 'EMBED_LINKS'])) {
            client.utils.ownerError('guildMemberAdd', client, `Channel Permission Error for channel: ${channel.id}`);
            return;
          }
          channel.send({ embed }).catch(logger.error);
        }
      });
    } catch (err) {
      client.utils.ownerError('guildMemberAdd', client, err);
    }
  },

  guildMemberRemove: async(client, member) => {
    const embed = new client.Discord.MessageEmbed()
      .setColor([215, 215, 30])
      .setAuthor(`${member.user.username}#${member.user.discriminator} (${member.user.id})`, member.user.avatarURL)
      .setFooter('User Left')
      .setTimestamp(moment());
    try {
      const channels = await client.mongo.welcomeChannels.find({ server_id: member.guild.id });
      channels.forEach(c => {
        const channel = member.guild.channels.get(c.channel_id);
        if (channel) {
          if (!channel.permissionsFor(client.user).has(['SEND_MESSAGES', 'EMBED_LINKS'])) {
            client.utils.ownerError('guildMemberAdd', client, `Channel Permission Error for channel: ${channel.id}`);
            return;
          }
          channel.send({ embed }).catch(logger.error);
        }
      });
    } catch (err) {
      client.utils.ownerError('guildMemberRemove', client, err);
      logger.error('Error posting member part messages', err);
    }
  },
};
