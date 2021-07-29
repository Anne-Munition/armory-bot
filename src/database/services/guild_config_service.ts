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
    guildConfigs.set(config.server_id, config.config)
  })
  log.info(`Loaded ${guildConfigs.size} guild configs.`)
}
