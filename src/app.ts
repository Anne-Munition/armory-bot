import birthdays from './birthdays.js';
import commandLoader from './command_loader.js';
import databaseCleanup from './database/cleanup.js';
import * as database from './database/index.js';
import * as discord from './discord.js';
import * as timeouts from './timeouts.js';
import * as twitch from './twitch/twitch.js';
import * as token from './twitch/twitch_token.js';
import { ownerSend } from './utilities.js';

export async function start(): Promise<void> {
  await token.fetchToken();
  await database.connect();
  await commandLoader.loadAllCommands();
  await discord.connect();
  await databaseCleanup.init();
  await timeouts.init();
  twitch.startTimers();
  birthdays();

  // DM the owner that the client has (re)started if in production
  if (process.env.NODE_ENV === 'production') {
    ownerSend('Startup complete');
  }
}

export async function stop(): Promise<void> {
  discord.disconnect();
  await database.disconnect();
}
