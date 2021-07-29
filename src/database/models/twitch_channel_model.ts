import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  channels: Array,
  display_name: String,
  image_url: String,
  login: String,
  twitch_id: String,
})

interface TwitchChannelsDoc extends Document {
  channels: string[]
  display_name: string
  image_url: string
  login: string
  twitch_id: string
}

export default model<TwitchChannelsDoc>('twitch_channels', schema)
