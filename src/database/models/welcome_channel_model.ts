import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  guild_id: String,
  channel_id: String,
})

export interface WelcomeChannelDoc extends Document {
  guild_id: string
  channel_id: string
}

export default model<WelcomeChannelDoc>('welcome_channels', schema)
