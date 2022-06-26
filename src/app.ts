import { Snowflake } from 'discord.js'
import commandLoader from './command_loader'
import * as database from './database'
import databaseCleanup from './database/cleanup'
import * as discord from './discord'
import client from './discord'
import * as timeouts from './timeouts'
import * as twitch from './twitch/twitch'
import * as token from './twitch/twitch_token'

export async function start(): Promise<void> {
  await token.fetchToken()
  await database.connect()
  await commandLoader.loadAllCommands()
  await discord.connect()
  await databaseCleanup.init()
  await timeouts.init()
  twitch.startTimers()

  // DM the owner that the client has (re)started if in production
  if (process.env.NODE_ENV === 'production') {
    const owner = await client.users.fetch(<Snowflake>process.env.OWNER_ID)
    if (owner) await owner.send('Startup complete.')
  }
}

export async function stop(): Promise<void> {
  discord.disconnect()
  await database.disconnect()
}
