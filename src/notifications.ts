import Discord, { Snowflake } from 'discord.js'
import JoinedGuildService from './database/services/joined_guild_service'
import * as WelcomeService from './database/services/welcome_channel_service'
import log from './logger'

// DM the bot owner that the client has joined a guild
async function guildCreate(guild: Discord.Guild): Promise<void> {
  log.debug(`guildCreate event: ${guild.name}`)
  const guildOwner = await guild.fetchOwner()
  const botOwner = await guild.client.users.fetch(
    <Discord.Snowflake>process.env.OWNER_ID,
  )
  if (!guildOwner || !botOwner) return
  log.info(
    `Joined the guild: '${guild.name}' - Owner: '${guildOwner.user.tag}'`,
  )
  const str = `Joined the guild: **${guild.name}** - Owner: **${guildOwner.user.tag}**`
  await botOwner.send(str)
  await JoinedGuildService.add(guild.id, guildOwner.user.tag)
}

// DM the bot owner that the client has left a guild
async function guildDelete(guild: Discord.Guild): Promise<void> {
  log.debug(`guildDelete event: ${guild.name}`)
  const botOwner = await guild.client.users.fetch(
    <Discord.Snowflake>process.env.OWNER_ID,
  )
  if (!botOwner) return
  const joinedDoc = await JoinedGuildService.get(guild.id)
  const guildOwnerTag = joinedDoc ? joinedDoc.owner_tag : 'Unknown'
  log.info(`Removed from guild: '${guild.name}' - Owner: '${guildOwnerTag}'`)
  const str = `Removed from guild: **${guild.name}** - Owner: **${guildOwnerTag}**`
  await botOwner.send(str)
}

async function guildMemberAdd(member: Discord.GuildMember): Promise<void> {
  log.debug(`guildMemberAdd event: ${member.user.tag}`)
  const channelDocs = await WelcomeService.find(member.guild.id)
  if (!channelDocs) return
  log.debug(
    `Posting welcome messages in (${channelDocs.length}) registered channels`,
  )
  const embed = new Discord.MessageEmbed()
    .setColor('#1ed21e')
    .setAuthor(
      `${member.user.tag} (${member.id})`,
      member.user.defaultAvatarURL,
    )
    .setFooter('User Joined')
    .setTimestamp()

  channelDocs.forEach((channelDoc) => {
    const channel = member.guild.channels.cache.get(
      <Snowflake>channelDoc.channel_id,
    )
    if (!channel || channel.type !== 'GUILD_TEXT') return
    const clientUserId = member.client.user?.id
    if (!clientUserId) return
    if (
      !channel
        .permissionsFor(<Snowflake>clientUserId)
        .has(['SEND_MESSAGES', 'EMBED_LINKS'])
    )
      return
    channel.send({ embeds: [embed] })
  })
}

function guildMemberRemove(
  member: Discord.GuildMember | Discord.PartialGuildMember,
): void {}

function guildBanAdd(ban: Discord.GuildBan): void {}

function guildBanRemove(ban: Discord.GuildBan): void {}

function threadCreate(thread: Discord.ThreadChannel): void {}

export default {
  guildCreate,
  guildDelete,
  guildMemberAdd,
  guildMemberRemove,
  guildBanAdd,
  guildBanRemove,
  threadCreate,
}
