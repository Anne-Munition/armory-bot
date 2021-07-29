import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  server_id: String,
  config: Object,
})

interface GuildConfigDoc extends Document {
  server_id: string
  config: GuildConfig
}

export default model<GuildConfigDoc>('guild_configs', schema)
