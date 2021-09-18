import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  discord_id: String,
  discord_name: String,
  count: { type: Number, default: 0 },
  deleted_count: { type: Number, default: 0 },
})

export interface NumberUserDoc extends Document {
  discord_id: Snowflake
  discord_name: string
  count: number
  deleted_count: number
}

export default model<NumberUserDoc>('number_users', schema)
