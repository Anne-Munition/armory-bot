import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  discord_channels: [
    {
      guild_id: String,
      channel_id: String,
    },
  ],
  display_name: String,
  image_url: String,
  login: String,
  twitch_id: String,
})

export interface TwitchChannelDoc extends Document {
  discord_channels: {
    guild_id: Snowflake
    channel_id: Snowflake
  }[]
  display_name: string
  image_url: string
  login: string
  twitch_id: string
}

export default model<TwitchChannelDoc>('twitch_channels', schema)
