import { Document, Schema, model } from 'mongoose'

const schema = new Schema({
  key: String,
  value: Number,
  created_at: { type: Date, default: new Date() },
})

export interface CountDoc extends Document {
  key: string
  value: number
  created_at: Date
}

export default model<CountDoc>('counts', schema)
