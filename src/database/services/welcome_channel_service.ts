import WelcomeChannel, {
  WelcomeChannelDoc,
} from '../models/welcome_channel_model'

export async function find(guildId: string): Promise<WelcomeChannelDoc[]> {
  return WelcomeChannel.find({ server_id: guildId })
}
