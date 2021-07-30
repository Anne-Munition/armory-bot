import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  guild_id: String,
  owner_tag: String,
})

export interface JoinedGuildDoc extends Document {
  guild_id: Snowflake
  owner_tag: string
}

export default model<JoinedGuildDoc>('joined_guilds', schema)
