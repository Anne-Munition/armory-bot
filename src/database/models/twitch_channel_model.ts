import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  channels: [
    {
      guild_id: String,
      channel_id: String,
    },
  ],
  display_name: String,
  image_url: String,
  login: String,
  twitch_id: String,
  hex: String,
})

export interface TwitchChannelDoc extends Document {
  channels: {
    guild_id: Snowflake
    channel_id: Snowflake
  }[]
  display_name: string
  image_url: string
  login: string
  twitch_id: string
  hex: import('discord.js').HexColorString
}

export default model<TwitchChannelDoc>('twitch_channels_new', schema)
