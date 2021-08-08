import { Snowflake } from 'discord.js'
import NotificationChannel, {
  NotificationChannelDoc,
} from '../models/notification_channel_model'

async function search(filter: {
  [key: string]: any
}): Promise<NotificationChannelDoc[]> {
  return NotificationChannel.find(filter)
}

async function get(guildId: Snowflake): Promise<NotificationChannelDoc[]> {
  return NotificationChannel.find({ guild_id: guildId })
}

async function save(guildId: string, channelId: string): Promise<void> {
  await new NotificationChannel({
    guild_id: guildId,
    channel_id: channelId,
  }).save()
}

async function remove(id: string): Promise<void> {
  await NotificationChannel.findByIdAndDelete(id)
}

export default {
  search,
  get,
  save,
  remove,
}
