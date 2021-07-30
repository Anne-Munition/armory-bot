import NotificationChannel, {
  NotificationChannelDoc,
} from '../models/notification_channel_model'

async function get(guildId: string): Promise<NotificationChannelDoc[]> {
  return NotificationChannel.find({ guild_id: guildId })
}

export default {
  get,
}
