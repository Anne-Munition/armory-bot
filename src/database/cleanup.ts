import _ from 'lodash';
import client from '../discord.js';
import logger from '../logger.js';
import { getUsers } from '../twitch/twitch_api.js';
import { ignore, ownerError } from '../utilities.js';
import NotificationChannel from './services/notification_channel_service.js';
import TwitchChannel from './services/twitch_channel_service.js';

async function init() {
  setInterval(cleanup, 1000 * 60 * 60 * 12);
  await cleanup();
  logger.debug('Done with initial database cleanup');
}

async function cleanup() {
  logger.debug('Running cleanup tasks');
  try {
    await cleanDocs(NotificationChannel);
    await cleanTwitchChannels();
  } catch (err: any) {
    if (err instanceof Error) {
      ownerError('Database Cleanup Error', err).catch(ignore);
    } else {
      ownerError('Database Cleanup Error', undefined, err).catch(ignore);
    }
  }
}

async function cleanDocs(service: typeof NotificationChannel) {
  const docs = await service.search({});
  for (let i = 0; i < docs.length; i++) {
    const item = docs[i];
    if (!item) continue;
    const guild = await client.guilds.fetch(item.guild_id);
    const channel = await client.channels.fetch(item.channel_id);
    if (!guild || !channel) await service.remove(item._id);
  }
}

async function cleanTwitchChannels() {
  const docs = await TwitchChannel.search({});
  const ids = docs.map((x) => x.twitch_id);
  const idChunks = _.chunk(ids, 100);
  let users: HelixUser[] = [];
  for (let i = 0; i < idChunks.length; i++) {
    const item = idChunks[i];
    if (!item) continue;
    const userChunk = await getUsers(item);
    users = users.concat(userChunk);
  }
  for (let i = 0; i < docs.length; i++) {
    const item = docs[i];
    if (!item) continue;
    const twitchChannelExists = users.find((x) => x.id === item.twitch_id);
    if (!twitchChannelExists) {
      await TwitchChannel.remove(item._id);
      continue;
    }
    const toRemove: number[] = [];
    for (let j = item.channels.length - 1; j >= 0; j--) {
      const obj = item.channels[j];
      if (!obj) continue;
      const guild = await client.guilds.fetch(obj.guild_id);
      const channel = await client.channels.fetch(obj.channel_id);
      if (!guild || !channel) {
        toRemove.push(j);
      }
    }
    toRemove.forEach((x) => {
      item.channels.splice(x, 1);
    });
    if (!item.channels.length) {
      await TwitchChannel.remove(item._id);
      continue;
    }
    if (toRemove.length) await TwitchChannel.save(item);
  }
}

export default {
  init,
};
