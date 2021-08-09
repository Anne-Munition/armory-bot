import { Snowflake } from 'discord.js'
import { muteRole } from '../../config'
import Timeout, { TimeoutsDoc } from '../models/timeout_model'

async function list(): Promise<TimeoutsDoc[]> {
  return Timeout.find({})
}

async function get(discordId: Snowflake): Promise<TimeoutsDoc | null> {
  return Timeout.findOne({ discord_id: discordId })
}

async function add(
  discordId: Snowflake,
  guildId: Snowflake,
  ms: number,
  username: string,
): Promise<void> {
  await new Timeout({
    discord_id: discordId,
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
