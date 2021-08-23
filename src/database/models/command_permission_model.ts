import { Snowflake } from 'discord.js'
import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  guild_id: String,
  command_name: String,
  permission: {
    id: String,
    type: String,
    permission: Boolean,
  },
})

export interface CmdPermDoc extends Document {
  guild_id: Snowflake
  command_name: string
  permission: {
    id: Snowflake
    type: 'USER' | 'ROLE'
    permission: boolean
  }
}

export default model<CmdPermDoc>('command_permissions', schema)
