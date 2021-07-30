import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  server_id: String,
  channel_id: String,
})

interface AuditChannelDoc extends Document {
  server_id: Snowflake
  channel_id: Snowflake
}

export default model<AuditChannelDoc>('audit_channels', schema)
