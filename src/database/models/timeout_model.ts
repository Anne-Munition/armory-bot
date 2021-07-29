import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  discordId: String,
  expiresAt: Date,
  username: String,
})

interface TimeoutsDoc extends Document {
  discordId: string
  expiresAt: Date
  username: string
}

export default model<TimeoutsDoc>('timeouts', schema)
