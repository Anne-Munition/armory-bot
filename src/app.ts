import commandLoader from './command_loader'
import * as database from './database'
import * as discord from './discord'
import Count from './messages/Count'
import * as numbers from './messages/numbers'
import * as timeouts from './timeouts'
import * as twitch from './twitch/twitch'
import * as token from './twitch_token'

export async function start(): Promise<void> {
  await token.fetchToken()
  await database.connect()
  await commandLoader.loadAllCommands()
  // await commandLoader.loadCommand('permissions')
  await discord.connect()
  Count.init()
  // await timeouts.init()
  // twitch.startTimers()
}

export async function stop(): Promise<void> {
  await numbers.lock()
  discord.disconnect()
  await database.disconnect()
}
