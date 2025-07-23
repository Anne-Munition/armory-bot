import { Message } from 'discord.js';
import * as aprilfools from '../commands/aprilfools.js';
import { getId } from '../config.js';
import counts from '../counts.js';
import log from '../logger.js';
import animalDetection from './message_animal_detection.js';
import schedulePinning from './schedule_pinning.js';
import spoilerTags from './spoiler_tags.js';

export default async function (msg: Message): Promise<void> {
  counts.increment('messagesSeen');

  const wasSchedule = await schedulePinning(msg).catch((err) => {
    log.error(err.stack || err.message || err);
  });
  if (wasSchedule) return;

  if (msg.guildId && msg.author.id === getId(msg.guildId, 'legacyReactionWebhookId')) {
    await msg.react('👎');
    await msg.react('👍');
    await msg.react('☑️');
    await msg.react('❌');
  }

  aprilfools.handleMessage(msg);

  if (msg.author.bot) return;

  spoilerTags(msg).catch((err) => {
    log.error(err.stack || err.message || err);
  });

  animalDetection(msg).catch((err) => {
    log.error(err.stack || err.message || err);
  });
}
