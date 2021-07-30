import commandLoader from './command_loader'
import * as database from './database'
import * as cmdPerms from './database/services/command_permission_service'
import * as guildConfigs from './database/services/guild_config_service'
import * as discord from './discord'
import * as timeouts from './timeouts'

export async function start(): Promise<void> {
  await commandLoader.loadAllMsgCmds().catch((err) => {
    throw new Error(`Error loading commands: ${err.message}`)
  })

  await database.connect()

  await guildConfigs.load().catch((err) => {
    throw new Error(`Error loading guild configs: ${err.message}`)
  })
  await cmdPerms.load().catch((err) => {
    throw new Error(`Error loading command permissions: ${err.message}`)
  })

  await discord.connect()
  await timeouts.init()
  // TODO: Start Twitch
}

export async function stop(): Promise<void> {
  discord.disconnect()
  await database.disconnect()
}
