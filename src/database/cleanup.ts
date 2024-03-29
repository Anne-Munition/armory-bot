import _ from 'lodash';
import client from '../discord';
import logger from '../logger';
import { getUsers } from '../twitch/twitch_api';
import { ignore, ownerError } from '../utilities';
import NotificationChannel from './services/notification_channel_service';
import TwitchChannel from './services/twitch_channel_service';

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
    const guild = await client.guilds.fetch(docs[i].guild_id);
    const channel = await client.channels.fetch(docs[i].channel_id);
    if (!guild || !channel) await service.remove(docs[i]._id);
  }
}

async function cleanTwitchChannels() {
  const docs = await TwitchChannel.search({});
  const ids = docs.map((x) => x.twitch_id);
  const idChunks = _.chunk(ids, 100);
  let users: HelixUser[] = [];
  for (let i = 0; i < idChunks.length; i++) {
    const userChunk = await getUsers(idChunks[i]);
    users = users.concat(userChunk);
  }
  for (let i = 0; i < docs.length; i++) {
    const twitchChannelExists = users.find((x) => x.id === docs[i].twitch_id);
    if (!twitchChannelExists) {
      await TwitchChannel.remove(docs[i]._id);
      continue;
    }
    const toRemove: number[] = [];
    for (let j = docs[i].channels.length - 1; j >= 0; j--) {
      const obj = docs[i].channels[j];
      const guild = await client.guilds.fetch(obj.guild_id);
      const channel = await client.channels.fetch(obj.channel_id);
      if (!guild || !channel) {
        toRemove.push(j);
      }
    }
    toRemove.forEach((x) => {
      docs[i].channels.splice(x, 1);
    });
    if (!docs[i].channels.length) {
      await TwitchChannel.remove(docs[i]._id);
      continue;
    }
    if (toRemove.length) await TwitchChannel.save(docs[i]);
  }
}

export default {
  init,
};
