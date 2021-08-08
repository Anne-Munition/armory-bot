import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  guild_id: String,
  config: Object,
})

interface GuildConfigDoc extends Document {
  guild_id: Snowflake
  config: GuildConfig
}

export default model<GuildConfigDoc>('guild_configs', schema)
