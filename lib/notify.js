'use strict';
const logger = require('winston');
const config = require('../config');

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
    const str = `**${member.user.username}** #${member.user.discriminator}` +
      ` has just joined the Discord Server!`;
    logger.debug(str);
    try {
      const channels = await client.mongo.welcomeChannels.find({ server_id: member.guild.id });
      logger.debug(`Posting welcome messages in (${channels.length}) registered channels`);
      channels.forEach(c => {
        const channel = member.guild.channels.get(c.channel_id);
        if (channel) channel.send(str);
      });
    } catch (e) {
      logger.error('Error posting member join messages', e);
    }
  },

  guildMemberRemove: async(client, member) => {
    const str = `**${member.user.username}** #${member.user.discriminator}` +
      ` was removed from the Discord Server.`;
    logger.debug(str);
    try {
      const channels = await client.mongo.welcomeChannels.find({ server_id: member.guild.id });
      channels.forEach(c => {
        const channel = member.guild.channels.get(c.channel_id);
        if (channel) channel.send(str);
      });
    } catch (e) {
      logger.error('Error posting member part messages', e);
    }
  },
};
