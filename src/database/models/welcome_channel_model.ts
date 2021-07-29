import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  server_id: String,
  channel_id: String,
})

interface WelcomeChannelDoc extends Document {
  server_id: string
  channel_id: string
}

export default model<WelcomeChannelDoc>('welcome_channels', schema)
