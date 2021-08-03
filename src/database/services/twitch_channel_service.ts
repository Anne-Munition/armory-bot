import TwitchChannel, { TwitchChannelDoc } from '../models/twitch_channel_model'

async function list(): Promise<TwitchChannelDoc[]> {
  return TwitchChannel.find({})
}

export default {
  list,
}
