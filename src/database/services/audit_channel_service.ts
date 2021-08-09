import AuditChannel, { AuditChannelDoc } from '../models/audit_channel_model'

async function search(filter: {
  [key: string]: any
}): Promise<AuditChannelDoc[]> {
  return AuditChannel.find(filter)
}

async function getByChannel(
  channelId: string,
): Promise<AuditChannelDoc | null> {
  return AuditChannel.findOne({ channel_id: channelId })
}

async function save(guildId: string, channelId: string): Promise<void> {
  await new AuditChannel({
    guild_id: guildId,
    channel_id: channelId,
  }).save()
}

async function remove(id: string): Promise<void> {
  await AuditChannel.findByIdAndDelete(id)
}

export default {
  search,
  save,
  remove,
  getByChannel,
}
