import { Snowflake } from 'discord.js';
import { Document, Schema, model } from 'mongoose';

const schema = new Schema({
  user_id: String,
  guild_id: String,
  channel_id: String,
  expires_at: Date,
  username: String,
  roles: Array,
});

export interface TimeoutsDoc extends Document {
  user_id: Snowflake;
  guild_id: Snowflake;
  channel_id: Snowflake;
  expires_at: Date;
  username: string;
  roles: Snowflake[];
}

export default model<TimeoutsDoc>('timeouts', schema);
