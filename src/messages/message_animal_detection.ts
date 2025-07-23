import { Message } from 'discord.js';
import detectAnimals from '../catdog_detection.js';
import { getId } from '../config.js';
import log from '../logger.js';

export default async function (msg: Message) {
  if (msg.guildId && msg.channel.id !== getId(msg.guildId, 'animalDetectionChannelId')) return;

  if (msg.attachments.size > 0) {
    const attachment = msg.attachments.first();
    if (attachment && attachment.url) {
      log.debug(`Detecting animals in image: ${attachment.url}`);
      return detectAnimals(attachment.url).then((result) => {
        log.debug(`Detected animals: ${JSON.stringify(result)}`);
        if (result.hasCat) {
          const catEmoji = msg.client.emojis.cache.find((emoji) => emoji.name === 'becky4') || '🐱';
          msg
            .react(catEmoji)
            .catch(() => {
              msg.react('🐱');
            })
            .catch((err) => {
              log.error(`Failed to react with cat emoji: ${err}`);
            });
        }
        if (result.hasDog) {
          const dogEmoji = msg.client.emojis.cache.find((emoji) => emoji.name === 'becky5') || '🐶';
          msg
            .react(dogEmoji)
            .catch(() => {
              msg.react('🐶');
            })
            .catch((err) => {
              log.error(`Failed to react with dog emoji: ${err}`);
            });
        }
      });
    }
  }
}
