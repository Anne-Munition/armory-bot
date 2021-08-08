import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  guild_id: String,
  channel_id: String,
})

export interface AuditChannelDoc extends Document {
  guild_id: Snowflake
  channel_id: Snowflake
}

export default model<AuditChannelDoc>('audit_channels', schema)
