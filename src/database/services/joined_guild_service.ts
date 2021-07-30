import { Snowflake } from 'discord.js'
import JoinedGuild, { JoinedGuildDoc } from '../models/joined_guild_model'

async function add(guildId: Snowflake, ownerTag: string): Promise<void> {
  await JoinedGuild.findOneAndUpdate(
    { guild_id: guildId },
    { guild_id: guildId, owner_tag: ownerTag },
    { upsert: true },
  )
}

async function get(guildId: Snowflake): Promise<JoinedGuildDoc | null> {
  return JoinedGuild.findOne({ guild_id: guildId })
}

export default {
  add,
  get,
}
