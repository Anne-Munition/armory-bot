import { Snowflake } from 'discord.js'
import { muteRole } from '../../config'
import Timeout, { TimeoutsDoc } from '../models/timeout_model'

async function list(): Promise<TimeoutsDoc[]> {
  return Timeout.find({})
}

async function get(userId: Snowflake): Promise<TimeoutsDoc | null> {
  return Timeout.findOne({ user_id: userId })
}

async function add(
  userId: Snowflake,
  guildId: Snowflake,
  ms: number,
  username: string,
): Promise<void> {
  await new Timeout({
    user_id: userId,
    guild_id: guildId,
    expires_at: new Date(new Date().valueOf() + ms).toISOString(),
    username,
    roles: [muteRole],
  }).save()
}

async function remove(id: string): Promise<void> {
  await Timeout.findByIdAndDelete(id)
}

export default {
  list,
  get,
  add,
  remove,
}
