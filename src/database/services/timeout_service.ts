import { Snowflake } from 'discord.js'
import Timeout, { TimeoutsDoc } from '../models/timeout_model'

async function list(): Promise<TimeoutsDoc[]> {
  return Timeout.find({})
}

async function get(discordId: Snowflake): Promise<TimeoutsDoc | null> {
  return Timeout.findOne({ discord_id: discordId })
}

export default {
  list,
  get,
}
