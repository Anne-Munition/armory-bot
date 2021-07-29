import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  server_id: String,
  cmd: String,
  perms: {
    allow: {
      members: Array,
      channels: Array,
      roles: Array,
    },
    deny: {
      members: Array,
      channels: Array,
      roles: Array,
    },
  },
})

export interface PermDoc extends Document {
  server_id: string
  cmd: string
  perms: {
    allow: CommandPermItems
    deny: CommandPermItems
  }
}

export default model<PermDoc>('cmd_perms', schema)
