import commandLoader from './command_loader'
import * as database from './database'
import * as discord from './discord'
import * as timeouts from './timeouts'
import * as twitch from './twitch/twitch'
import * as token from './twitch/twitch_token'

export async function start(): Promise<void> {
  await token.fetchToken()
  await database.connect()
  await commandLoader.loadAllCommands()
  await discord.connect()
  await timeouts.init()
  // twitch.startTimers()
}

export async function stop(): Promise<void> {
  discord.disconnect()
  await database.disconnect()
}
