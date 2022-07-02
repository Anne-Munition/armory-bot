import { Snowflake } from 'discord.js'
import commandLoader from './command_loader'
import * as database from './database'
import databaseCleanup from './database/cleanup'
import * as discord from './discord'
import * as se from './streamelements'
import * as timeouts from './timeouts'
import * as twitch from './twitch/twitch'
import * as token from './twitch/twitch_token'
import * as twitter from './twitter'
import { ignore, ownerSend } from './utilities'

export async function start(): Promise<void> {
  await token.fetchToken()
  await database.connect()
  await commandLoader.loadAllCommands()
  await discord.connect()
  await databaseCleanup.init()
  await timeouts.init()
  twitch.startTimers()
  await se.init()
  await twitter.init()
  twitter.connect().catch(ignore)

  // DM the owner that the client has (re)started if in production
  if (process.env.NODE_ENV === 'production') {
    ownerSend('Startup complete.').catch(ignore)
  }
}

export async function stop(): Promise<void> {
  twitter.disconnect()
  discord.disconnect()
  await database.disconnect()
}
