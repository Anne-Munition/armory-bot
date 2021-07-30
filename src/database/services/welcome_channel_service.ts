import WelcomeChannel, {
  WelcomeChannelDoc,
} from '../models/welcome_channel_model'

async function get(guildId: string): Promise<WelcomeChannelDoc[]> {
  return WelcomeChannel.find({ guild_id: guildId })
}

export default {
  get,
}
