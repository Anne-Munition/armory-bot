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

  guildMemberAdd: async (client, member) => {
    const channels = await client.mongo.welcomeChannels.find({ server_id: member.guild.id });
    if (!channels) return;
    logger.debug(`Posting welcome messages in (${channels.length}) registered channels`);
    const embed = new client.Discord.RichEmbed()
      .setColor('#1ed21e')
      .setAuthor(`${member.user.username}#${member.user.discriminator} (${member.user.id})`,
        member.user.displayAvatarURL)
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
    const embed = new client.Discord.RichEmbed()
      .setColor('#d7d71e')
      .setAuthor(`${member.user.username}#${member.user.discriminator} (${member.user.id})`,
        member.user.displayAvatarURL)
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
    const deletedAt = Date.now();
    const deletedAfterDuration = moment.duration(deletedAt - message.createdTimestamp);

    // Determine if there are any channels interested in this notification
    // Only matches channels in the same guild the message was deleted in
    const clientGuildMember = message.guild.members.get(client.user.id);
    if (!clientGuildMember) return;
    if (!clientGuildMember.hasPermission(['VIEW_AUDIT_LOG'])) return;
    const channels = await client.mongo.auditChannels.find({ server_id: message.guild.id });
    // Exit if there are channels to notify
    if (!channels) return;
    const entry = await message.guild.fetchAuditLogs({ type: 'MESSAGE_DELETE' }).then(audit => audit.entries.first());

    let executor;
    let self;
    if (entry &&
      entry.extra.channel.id === message.channel.id &&
      entry.target.id === message.author.id &&
      deletedAt - entry.createdTimestamp < 5000 &&
      entry.extra.count >= 1) {
      executor = entry.executor;
      self = false;
    } else {
      executor = message.author;
      self = true;
    }

    if (self === true && executor.id === client.user.id) return;

    logger.debug(`Posting deletion audit messages in (${channels.length}) registered channels`);

    const embed = new client.Discord.RichEmbed()
      .setAuthor(`${message.author.tag} (${message.author.id})`, message.author.displayAvatarURL)
      .setTitle(`#${message.channel.name} (${message.channel.id}) (${message.id})`)
      .setDescription(message.cleanContent)
      .setFooter(`Deleted by ${self ? 'SELF' : executor.tag} after ${deletedAfterDuration.humanize()}`)
      .setTimestamp();
    if (!self) embed.setColor('#d76db7');
    const embeds = message.embeds;
    if (embeds && embeds.length > 0) {
      embed.addField('# of Embedded Elements', embeds.length, true);
    }
    const attachments = message.attachments;
    if (attachments && attachments.size > 0) {
      embed.addField('# of Attachments', attachments.size, true);
    }
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
    return;
    if (oldMessage.author.id === client.user.id) return;
    const channels = await client.mongo.auditChannels.find({ server_id: oldMessage.guild.id });
    if (!channels) return;
    const embed = new client.Discord.RichEmbed()
      .setAuthor(`${oldMessage.author.tag} (${oldMessage.author.id})`, oldMessage.author.displayAvatarURL)
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
