import { Snowflake } from 'discord.js';
import { getId } from '../../config.js';
import Timeout, { TimeoutsDoc } from '../models/timeout_model.js';

// Omit guildId to list the timeouts across all guilds
async function list(guildId?: Snowflake): Promise<TimeoutsDoc[]> {
  return Timeout.find(guildId ? { guild_id: guildId } : {});
}

async function get(userId: Snowflake, guildId: Snowflake): Promise<TimeoutsDoc | null> {
  return Timeout.findOne({ user_id: userId, guild_id: guildId });
}

async function add(
  userId: Snowflake,
  guildId: Snowflake,
  channelId: Snowflake,
  ms: number,
  username: string,
): Promise<void> {
  await new Timeout({
    user_id: userId,
    guild_id: guildId,
    channel_id: channelId,
    expires_at: new Date(new Date().valueOf() + ms).toISOString(),
    username,
    roles: [getId(guildId, 'muteRole')],
  }).save();
}

async function remove(id: string): Promise<void> {
  await Timeout.findByIdAndDelete(id);
}

export default {
  list,
  get,
  add,
  remove,
};
