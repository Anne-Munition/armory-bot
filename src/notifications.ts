import Discord, { Snowflake } from 'discord.js'
import { NotificationChannelDoc } from './database/models/notification_channel_model'
import JoinedGuild from './database/services/joined_guild_service'
import NotificationChannel from './database/services/notification_channel_service'
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
  await JoinedGuild.add(guild.id, guildOwner.user.tag)
}

// DM the bot owner that the client has left a guild
async function guildDelete(guild: Discord.Guild): Promise<void> {
  log.debug(`guildDelete event: ${guild.name}`)
  const botOwner = await guild.client.users.fetch(
    <Discord.Snowflake>process.env.OWNER_ID,
  )
  if (!botOwner) return
  const joinedDoc = await JoinedGuild.get(guild.id)
  const guildOwnerTag = joinedDoc ? joinedDoc.owner_tag : 'Unknown'
  log.info(`Removed from guild: '${guild.name}' - Owner: '${guildOwnerTag}'`)
  const str = `Removed from guild: **${guild.name}** - Owner: **${guildOwnerTag}**`
  await botOwner.send(str)
}

// Post in all registered welcome channels that a member has joined a guild
async function guildMemberAdd(member: Discord.GuildMember): Promise<void> {
  log.debug(`guildMemberAdd event: ${member.displayName}`)
  const channelDocs = await NotificationChannel.get(member.guild.id)
  if (!channelDocs) return
  log.debug(`posting guildMemberAdd in (${channelDocs.length}) channels`)
  const embed = new Discord.MessageEmbed()
    .setColor('#1ed21e')
    .setAuthor(
      `${member.user.tag} (${member.id})`,
      member.user.displayAvatarURL(),
    )
    .setFooter('User Joined')
    .setTimestamp()

  sendMessages(channelDocs, embed, member.guild)
}

// Post in all registered welcome channels that a member has left a guild
async function guildMemberRemove(
  member: Discord.GuildMember | Discord.PartialGuildMember,
): Promise<void> {
  log.debug(`guildMemberRemove event: ${member.displayName}`)
  const guildMember = member as Discord.GuildMember
  const channelDocs = await NotificationChannel.get(guildMember.guild.id)
  if (!channelDocs) return
  log.debug(`posting guildMemberRemove in (${channelDocs.length}) channels`)
  const embed = new Discord.MessageEmbed()
    .setColor('#d7d71e')
    .setAuthor(
      `${guildMember.user.tag} (${guildMember.id})`,
      guildMember.user.displayAvatarURL(),
    )
    .setFooter('User Left')
    .setTimestamp()

  sendMessages(channelDocs, embed, guildMember.guild)
}

// Post in all registered welcome channels that a member has been banned from a guild
async function guildBanAdd(ban: Discord.GuildBan): Promise<void> {
  log.debug(`guildBanAdd event: ${ban.user.username}`)
  const channelDocs = await NotificationChannel.get(ban.guild.id)
  if (!channelDocs) return
  log.debug(`posting guildBanAdd in (${channelDocs.length}) channels`)

  const embed = new Discord.MessageEmbed()
    .setColor('#b42326')
    .setAuthor(`${ban.user.tag} (${ban.user.id})`, ban.user.displayAvatarURL())
    .setFooter('User Banned')
    .setTimestamp()
  if (ban.reason) embed.setDescription(ban.reason)

  sendMessages(channelDocs, embed, ban.guild)
}

// Post in all registered welcome channels that a member has been unbanned from a guild
async function guildBanRemove(ban: Discord.GuildBan): Promise<void> {
  log.debug(`guildBanRemove event: ${ban.user.username}`)
  const channelDocs = await NotificationChannel.get(ban.guild.id)
  if (!channelDocs) return
  log.debug(`posting guildBanRemove in (${channelDocs.length}) channels`)

  const embed = new Discord.MessageEmbed()
    .setColor('#236cb4')
    .setAuthor(`${ban.user.tag} (${ban.user.id})`, ban.user.displayAvatarURL())
    .setFooter('User Unbanned')
    .setTimestamp()

  sendMessages(channelDocs, embed, ban.guild)
}

// Post in all registered welcome channels that a new thread has been created in a guild
async function threadCreate(thread: Discord.ThreadChannel): Promise<void> {
  const channelDocs = await NotificationChannel.get(thread.guild.id)
  if (!channelDocs) return
  log.debug(`posting threadCreate in (${channelDocs.length}) channels`)

  let threadOwner
  if (thread.ownerId)
    threadOwner = await thread.client.users.fetch(thread.ownerId)

  const embed = new Discord.MessageEmbed()
    .setColor('#fd9b2e')
    .setAuthor(
      'New Thread Created',
      'https://img.icons8.com/emoji/50/000000/thread.png',
    )
    .setDescription(`${thread.parent}\n└ ${thread}`)
    .setTimestamp()

  if (threadOwner) embed.setFooter(`Created by: ${threadOwner.tag}`)

  sendMessages(channelDocs, embed, thread.guild)
}

function sendMessages(
  channelDocs: NotificationChannelDoc[],
  embed: Discord.MessageEmbed,
  guild: Discord.Guild,
) {
  channelDocs.forEach((channelDoc) => {
    const channel = guild.channels.cache.get(<Snowflake>channelDoc.channel_id)
    if (!channel || channel.type !== 'GUILD_TEXT') return
    const textChannel = channel as Discord.TextChannel
    const clientUser = guild.client.user
    if (!clientUser) return
    const permissions = textChannel.permissionsFor(clientUser.id)
    if (permissions && !permissions.has(['SEND_MESSAGES'])) return
    textChannel.send({ embeds: [embed] }).catch()
  })
}

async function pinActiveThreads(guild: Discord.Guild): Promise<void> {
  const clientUser = guild.client.user
  if (!clientUser) return

  const channelDocs = await NotificationChannel.get(guild.id)
  if (!channelDocs) return
  log.debug(`pinning threads in (${channelDocs.length}) channels`)

  const threadChannels = guild.channels.cache.filter(
    (channel) => channel.type === 'GUILD_PUBLIC_THREAD',
  ) as Discord.Collection<`${bigint}`, Discord.ThreadChannel>

  const activeChannels = threadChannels.filter((thread) => !thread.archived)
  if (!activeChannels.size) return
  log.debug(`active threads: ${activeChannels.size}`)

  const groupedThreads: {
    [key: string]: { threads: Discord.ThreadChannel[]; parent: string }
  } = {}

  activeChannels.forEach((active) => {
    const parent = active.parent
    if (!parent) return
    if (groupedThreads[parent.id]) {
      groupedThreads[parent.id].threads.push(active)
    } else {
      groupedThreads[parent.id] = {
        threads: [active],
        parent: parent.toString(),
      }
    }
  })

  let response = ''

  Object.keys(groupedThreads).forEach((key) => {
    const group = groupedThreads[key]
    response += `${group.parent}\n`
    response += group.threads
      .map((thread, index) => {
        const symbol = index === group.threads.length - 1 ? '└' : '├'
        return `${symbol}${thread}`
      })
      .join('\n')
    response += '\n'
  })

  const pinContent = `ACTIVE THREADS:\n${response}`

  for (const i in channelDocs) {
    const channel = guild.channels.cache.get(
      <Snowflake>channelDocs[i].channel_id,
    )
    if (!channel || channel.type !== 'GUILD_TEXT') continue
    const permissions = channel.permissionsFor(clientUser.id)

    if (!permissions || !permissions.has('SEND_MESSAGES')) continue

    const textChannel = channel as Discord.TextChannel
    const pinnedMessages = await textChannel.messages.fetchPinned()
    const existingThreadPin = pinnedMessages.find((msg) => {
      return msg.content.startsWith('ACTIVE THREADS:')
    })
    if (!existingThreadPin) {
      const newMsg = await textChannel.send(pinContent)
      if (!permissions.has('MANAGE_MESSAGES')) continue
      await newMsg.pin()
    } else {
      await existingThreadPin.edit(pinContent)
    }
  }
}

export default {
  guildCreate,
  guildDelete,
  guildMemberAdd,
  guildMemberRemove,
  guildBanAdd,
  guildBanRemove,
  threadCreate,
  pinActiveThreads,
}
