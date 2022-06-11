import Discord, { Message, MessageEmbed, PartialMessage } from 'discord.js'
import humanizeDuration from 'humanize-duration'
import { Duration } from 'luxon'
import AuditChannelService from '../database/services/audit_channel_service'
import logger from '../logger'

async function messageDelete(msg: Message | PartialMessage) {
  if (!msg) return
  if (msg.channel.id === '460167577021186059') return
  if (!msg.client.user) return
  if (!msg.content) return
  if (!msg.guild) return
  if (!msg.author) return
  if (!msg.channel.isText()) return
  const channel = msg.channel as Discord.TextChannel
  const deletedAt = Date.now()
  const deletedAfterDuration = Duration.fromMillis(deletedAt - msg.createdTimestamp)
  const clientGuildMember = await msg.guild.members.fetch(msg.client.user.id)
  if (!clientGuildMember) return
  if (!clientGuildMember.permissions.has(['VIEW_AUDIT_LOG'])) return
  const channels = await AuditChannelService.search({
    server_id: msg.guild.id,
  })
  if (!channels || !channels.length) return
  const entry = await msg.guild
    .fetchAuditLogs({ type: 'MESSAGE_DELETE' })
    .then((audit) => audit.entries.first())

  let executor
  let self
  if (
    entry &&
    entry.extra.channel.id === msg.channel.id &&
    entry.target.id === msg.author.id &&
    deletedAt - entry.createdTimestamp < 5000 &&
    entry.extra.count >= 1 &&
    entry.executor
  ) {
    executor = entry.executor
    self = false
  } else {
    executor = msg.author
    self = true
  }

  if (self === true && (executor.bot || executor.id === msg.client.user.id)) return

  logger.debug(`Posting deletion audit messages in (${channels.length}) registered channels`)

  const embed = new MessageEmbed()
    .setAuthor({
      name: `${msg.author.tag} (${msg.author.id})`,
      url: msg.author.displayAvatarURL(),
    })
    .setTitle(`#${channel.name}`)
    .setURL(`https://discordapp.com/channels/${msg.guild.id}/${channel.id}`)
    .setFooter({
      text: `Deleted by ${self ? 'SELF' : executor.tag} after ${humanizeDuration(
        deletedAfterDuration.toMillis(),
      )}`,
    })
    .setTimestamp()
  if (!self) embed.setColor('#d76db7')
  if (msg.cleanContent) embed.setDescription(msg.cleanContent)

  channels.forEach((c) => {
    const guild = msg.guild
    if (!guild) return
    if (!msg.client?.user) return
    const channel = guild.channels.cache.get(c.channel_id)
    if (!channel || !channel.isText()) return
    const permissions = channel.permissionsFor(msg.client?.user)
    if (!permissions) return
    if (!permissions.has(['SEND_MESSAGES', 'EMBED_LINKS'])) return
    channel.send({ embeds: [embed] }).catch(logger.error)
  })
}

function messageUpdate(prev: Message | PartialMessage, next: Message | PartialMessage) {
  if (prev && next) {
    // TODO
  }
}

export default {
  messageDelete,
  messageUpdate,
}
