import { guildConfigs } from '../../collections'
import { defaultPrefix } from '../../config'
import log from '../../logger'
import GuildConfig from '../models/guild_config_model'

export const defaultGuildConfig: GuildConfig = {
  prefix: defaultPrefix,
}

export async function load(): Promise<void> {
  const configs = await GuildConfig.find({})
  guildConfigs.clear()
  configs.forEach((config) => {
    guildConfigs.set(config.guild_id, config.config)
  })
  log.info(`Loaded ${guildConfigs.size} guild configs.`)
}

export async function update(
  guildId: string,
  config: GuildConfig,
): Promise<void> {
  await GuildConfig.findOneAndUpdate(
    { guild_id: guildId },
    { guild_id: guildId, config },
    { upsert: true },
  )
}
