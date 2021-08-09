import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  discord_id: String,
  guild_id: String,
  expires_at: Date,
  username: String,
  roles: Array,
})

export interface TimeoutsDoc extends Document {
  discord_id: Snowflake
  guild_id: Snowflake
  expires_at: Date
  username: string
  roles: Snowflake[]
}

export default model<TimeoutsDoc>('timeouts', schema)
