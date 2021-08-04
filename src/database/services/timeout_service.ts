import { Snowflake } from 'discord.js'
import moment from 'moment'
import Timeout, { TimeoutsDoc } from '../models/timeout_model'

async function list(): Promise<TimeoutsDoc[]> {
  return Timeout.find({})
}

async function get(discordId: Snowflake): Promise<TimeoutsDoc | null> {
  return Timeout.findOne({ discord_id: discordId })
}

async function add(
  discordId: Snowflake,
  ms: number,
  username: string,
): Promise<void> {
  await new Timeout({
    discordId,
    expiresAt: moment().add(ms, 'milliseconds'),
    username,
  }).save()
}

export default {
  list,
  get,
  add,
}
