import * as Discord from 'discord.js';
import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { NotificationChannelDoc } from './database/models/notification_channel_model.js';
import JoinedGuild from './database/services/joined_guild_service.js';
import NotificationChannel from './database/services/notification_channel_service.js';
import log from './logger.js';

// DM the bot owner that the client has joined a guild
async function guildCreate(guild: Discord.Guild): Promise<void> {
  log.debug(`guildCreate event: ${guild.name}`);
  const guildOwner = await guild.fetchOwner();
  const botOwner = await guild.client.users.fetch(<Discord.Snowflake>process.env.OWNER_ID);
  if (!guildOwner || !botOwner) return;
  log.info(`Joined the guild: '${guild.name}' - Owner: '${guildOwner.user.tag}'`);
  const str = `Joined the guild: **${guild.name}** - Owner: **${guildOwner.user.tag}**`;
  await botOwner.send(str);
  await JoinedGuild.add(guild.id, guildOwner.user.tag);
}

// DM the bot owner that the client has left a guild
async function guildDelete(guild: Discord.Guild): Promise<void> {
  log.debug(`guildDelete event: ${guild.name}`);
  const botOwner = await guild.client.users.fetch(<Discord.Snowflake>process.env.OWNER_ID);
  if (!botOwner) return;
  const joinedDoc = await JoinedGuild.get(guild.id);
  const guildOwnerTag = joinedDoc ? joinedDoc.owner_tag : 'Unknown';
  log.info(`Removed from guild: '${guild.name}' - Owner: '${guildOwnerTag}'`);
  const str = `Removed from guild: **${guild.name}** - Owner: **${guildOwnerTag}**`;
  await botOwner.send(str);
}

// Post in all registered notification channels that a member has joined a guild
async function guildMemberAdd(member: Discord.GuildMember): Promise<void> {
  log.debug(`guildMemberAdd event: ${member.displayName}`);
  const channelDocs = await NotificationChannel.getByGuild(member.guild.id);
  if (!channelDocs) return;

  log.debug(`posting guildMemberAdd in (${channelDocs.length}) channels`);
  const embed = new Discord.EmbedBuilder()
    .setColor('#1ed21e')
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.displayAvatarURL(),
    })
    .setDescription(member.user.toString())
    .setFooter({
      text: 'User Joined',
    })
    .setTimestamp();

  sendMessages(channelDocs, embed, member.guild);
}

// Post in all registered notification channels that a member has left a guild
async function guildMemberRemove(
  member: Discord.GuildMember | Discord.PartialGuildMember,
): Promise<void> {
  log.debug(`guildMemberRemove event: ${member.displayName}`);
  const guildMember = member as Discord.GuildMember;
  const channelDocs = await NotificationChannel.getByGuild(guildMember.guild.id);
  if (!channelDocs) return;
  log.debug(`posting guildMemberRemove in (${channelDocs.length}) channels`);
  const embed = new Discord.EmbedBuilder()
    .setColor('#d7d71e')
    .setAuthor({
      name: guildMember.user.tag,
      iconURL: guildMember.user.displayAvatarURL(),
    })
    .setDescription(guildMember.user.toString())
    .setFooter({
      text: 'User Left',
    })
    .setTimestamp();

  sendMessages(channelDocs, embed, guildMember.guild);
}

// Post in all registered notification channels that a member has been banned from a guild
async function guildBanAdd(ban: Discord.GuildBan): Promise<void> {
  log.debug(`guildBanAdd event: ${ban.user.username}`);
  const channelDocs = await NotificationChannel.getByGuild(ban.guild.id);
  if (!channelDocs) return;
  log.debug(`posting guildBanAdd in (${channelDocs.length}) channels`);

  const embed = new Discord.EmbedBuilder()
    .setColor('#b42326')
    .setAuthor({
      name: ban.user.tag,
      iconURL: ban.user.displayAvatarURL(),
    })
    .setDescription(ban.user.toString())
    .setFooter({
      text: 'User Banned',
    })
    .setTimestamp();
  if (ban.reason) embed.setDescription(ban.reason);

  sendMessages(channelDocs, embed, ban.guild);
}

// Post in all registered notification channels that a member has been unbanned from a guild
async function guildBanRemove(ban: Discord.GuildBan): Promise<void> {
  log.debug(`guildBanRemove event: ${ban.user.username}`);
  const channelDocs = await NotificationChannel.getByGuild(ban.guild.id);
  if (!channelDocs) return;
  log.debug(`posting guildBanRemove in (${channelDocs.length}) channels`);

  const embed = new Discord.EmbedBuilder()
    .setColor('#236cb4')
    .setAuthor({
      name: ban.user.tag,
      iconURL: ban.user.displayAvatarURL(),
    })
    .setDescription(ban.user.toString())
    .setFooter({
      text: 'User Unbanned',
    })
    .setTimestamp();

  sendMessages(channelDocs, embed, ban.guild);
}

function sendMessages(
  channelDocs: NotificationChannelDoc[],
  embed: Discord.EmbedBuilder,
  guild: Discord.Guild,
) {
  channelDocs.forEach((channelDoc) => {
    const channel = guild.channels.cache.get(<Discord.Snowflake>channelDoc.channel_id);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    const textChannel = channel as Discord.TextChannel;
    const clientUser = guild.client.user;
    if (!clientUser) return;
    const permissions = textChannel.permissionsFor(clientUser.id);
    if (permissions && !permissions.has([PermissionFlagsBits.SendMessages])) return;
    textChannel.send({ embeds: [embed] }).catch();
  });
}

export default {
  guildCreate,
  guildDelete,
  guildMemberAdd,
  guildMemberRemove,
  guildBanAdd,
  guildBanRemove,
};
