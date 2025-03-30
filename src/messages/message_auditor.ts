import * as Discord from 'discord.js';
import {
  AuditLogEvent,
  ChannelType,
  EmbedBuilder,
  Message,
  PartialMessage,
  PermissionFlagsBits,
} from 'discord.js';
import humanizeDuration from 'humanize-duration';
import { Duration } from 'luxon';
import { getId } from '../config.js';
import logger from '../logger.js';

async function messageDelete(msg: Message | PartialMessage) {
  logger.debug('Message Deleted');
  if (!msg) return;
  if (msg.partial) msg = await msg.channel.messages.fetch(msg.id);
  if (!msg.guildId) return;
  const auditChannelId = getId(msg.guildId, 'auditChannelId');
  if (!auditChannelId) return;
  if (msg.channel.id === auditChannelId) return;
  const auditChannel = await msg.client.channels.fetch(auditChannelId);
  if (!auditChannel) return;
  if (!msg.client.user) return;
  if (!msg.content) return;
  if (!msg.guild) return;
  if (!msg.author) return;
  if (msg.channel.type !== ChannelType.GuildText) return;

  const channel = msg.channel as Discord.TextChannel;
  const deletedAt = Date.now();
  const deletedAfterDuration = Duration.fromMillis(deletedAt - msg.createdTimestamp);
  const clientGuildMember = await msg.guild.members.fetch(msg.client.user.id);
  if (!clientGuildMember) return;
  if (!clientGuildMember.permissions.has([PermissionFlagsBits.ViewAuditLog])) return;
  const entry = await msg.guild
    .fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 5 })
    .then((audit) =>
      audit.entries.find((entry) => {
        return (
          entry.extra.channel.id === msg.channel.id &&
          entry.target.id === msg.author?.id &&
          deletedAt - entry.createdTimestamp < 5000 &&
          entry.extra.count >= 1
        );
      }),
    );

  let executor;
  let self;
  if (entry && entry.executor) {
    executor = entry.executor;
    self = false;
  } else {
    executor = msg.author;
    self = true;
  }

  if (self === true && (executor.bot || executor.id === msg.client.user.id)) return;

  logger.debug(`Posting deletion audit messages in channel: ${auditChannel.toString()}`);

  const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
  const executorName = executor.discriminator === '0' ? executor.username : executor.tag;

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${authorName} (${msg.author.id})`,
      url: msg.author.displayAvatarURL(),
    })
    .setTitle(`#${channel.name}`)
    .setURL(`https://discordapp.com/channels/${msg.guild.id}/${channel.id}`)
    .setFooter({
      text: `Deleted by ${self ? 'SELF' : executorName} after ${humanizeDuration(
        deletedAfterDuration.toMillis(),
      )}`,
    })
    .setTimestamp();
  if (!self) embed.setColor('#d76db7');
  if (msg.cleanContent) embed.setDescription(msg.cleanContent);

  const guild = msg.guild;
  if (!guild) return;
  if (!msg.client?.user) return;
  if (!auditChannel || auditChannel.type !== ChannelType.GuildText) return;
  const permissions = auditChannel.permissionsFor(msg.client?.user);
  if (!permissions) return;
  if (!permissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) return;
  auditChannel.send({ embeds: [embed] }).catch(logger.error);
}

function messageUpdate(prev: Message | PartialMessage, next: Message | PartialMessage) {
  if (prev && next) {
    // TODO
    /*
    * messageUpdated: async (client, oldMessage, newMessage) => {
    return
    if (oldMessage.author.id === client.user.id) return
    const channels = await client.mongo.auditChannels.find({
      server_id: oldMessage.guild.id,
    })
    if (!channels) return
    const embed = new client.Discord.MessageEmbed()
      .setAuthor(
        `${oldMessage.author.tag} (${oldMessage.author.id})`,
        oldMessage.author.displayAvatarURL(),
      )
      .setFooter(`Updated: (${oldMessage.id})`)
      .setTimestamp()
    if (oldMessage.content) embed.addField('Original', oldMessage.cleanContent)
    if (newMessage.content) embed.addField('Updated', newMessage.cleanContent)
    channels.forEach((c) => {
      const channel = oldMessage.guild.channels.cache.get(c.channel_id)
      if (channel) {
        if (
          !channel
            .permissionsFor(client.user)
            .has(['SEND_MESSAGES', 'EMBED_LINKS'])
        ) {
          client.utils.ownerError(
            'messageUpdate',
            client,
            `Channel Permission Error for channel: ${channel.id}`,
          )
          return
        }
        channel.send({ embed }).catch(logger.error)
      }
    })
  },
  */
  }
}

export default {
  messageDelete,
  messageUpdate,
};
