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

  guildMemberAdd: async (client, member) => {
    const channels = await client.mongo.welcomeChannels.find({ server_id: member.guild.id });
    if (!channels) return;
    logger.debug(`Posting welcome messages in (${channels.length}) registered channels`);
    const embed = new client.Discord.MessageEmbed()
      .setColor([30, 210, 30])
      .setAuthor(`${member.user.username}#${member.user.discriminator} (${member.user.id})`,
        member.user.displayAvatarURL())
      .setFooter('User Joined')
      .setTimestamp();
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
  },

  guildMemberRemove: async (client, member) => {
    const channels = await client.mongo.welcomeChannels.find({ server_id: member.guild.id });
    if (!channels) return;
    logger.debug(`Posting part messages in (${channels.length}) registered channels`);
    const embed = new client.Discord.MessageEmbed()
      .setColor([215, 215, 30])
      .setAuthor(`${member.user.username}#${member.user.discriminator} (${member.user.id})`,
        member.user.displayAvatarURL())
      .setFooter('User Left')
      .setTimestamp();
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
  },

  messageDeleted: async (client, message) => {
    const channels = await client.mongo.auditChannels.find({ server_id: message.guild.id });
    if (!channels) return;
    logger.debug(`Posting deletion audit messages in (${channels.length}) registered channels`);
    const embed = new client.Discord.MessageEmbed()
      .setAuthor(`${message.author.tag} (${message.author.id})`, message.author.displayAvatarURL())
      .setDescription(message.cleanContent)
      .setFooter(`Deleted: (${message.id})`)
      .setTimestamp();
    channels.forEach(c => {
      const channel = message.guild.channels.get(c.channel_id);
      if (channel) {
        if (!channel.permissionsFor(client.user).has(['SEND_MESSAGES', 'EMBED_LINKS'])) {
          client.utils.ownerError('messageDelete', client, `Channel Permission Error for channel: ${channel.id}`);
          return;
        }
        channel.send({ embed }).catch(logger.error);
      }
    });
  },

  messageUpdated: async (client, oldMessage, newMessage) => {
    if (oldMessage.author.id === client.user.id) return;
    const channels = await client.mongo.auditChannels.find({ server_id: oldMessage.guild.id });
    if (!channels) return;
    const embed = new client.Discord.MessageEmbed()
      .setAuthor(`${oldMessage.author.tag} (${oldMessage.author.id})`, oldMessage.author.displayAvatarURL())
      .setFooter(`Updated: (${oldMessage.id})`)
      .setTimestamp();
    if (oldMessage.content) embed.addField('Original', oldMessage.cleanContent);
    if (newMessage.content) embed.addField('Updated', newMessage.cleanContent);
    channels.forEach(c => {
      const channel = oldMessage.guild.channels.get(c.channel_id);
      if (channel) {
        if (!channel.permissionsFor(client.user).has(['SEND_MESSAGES', 'EMBED_LINKS'])) {
          client.utils.ownerError('messageUpdate', client, `Channel Permission Error for channel: ${channel.id}`);
          return;
        }
        channel.send({ embed }).catch(logger.error);
      }
    });
  },
};
