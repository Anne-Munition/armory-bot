import { Document, Schema, model } from 'mongoose';

const schema = new Schema({
  discord_id: { type: String, required: true },
  birthdate: { type: String, required: true },
  format: { type: String, required: true },
  edits_remaining: { type: Number, default: 5 },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: () => new Date() },
  updated_at: { type: Date },
});

export interface BirthdayDoc extends Document {
  discord_id: string;
  birthdate: string;
  format: string;
  edits_remaining: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default model<BirthdayDoc>('birthdays', schema);
