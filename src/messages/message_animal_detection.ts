import { Message } from 'discord.js';
import detectAnimals from '../catdog_detection.js';
import { getId } from '../config.js';
import log from '../logger.js';

export default async function (msg: Message) {
  if (msg.guildId && msg.channel.id !== getId(msg.guildId, 'animalDetectionChannelId')) return;

  // See if this message has attachments and if so get their url and pass it to the detectAnimals function
  if (msg.attachments.size > 0) {
    const attachment = msg.attachments.first();
    // Do nothing if the attachment is not an image
    if (attachment && attachment.url) {
      log.debug(`Detecting animals in image: ${attachment.url}`);
      // Replace webp format with png if it exists, as coco-ssd does not support webp
      // This is a workaround for the issue where coco-ssd does not support webp images
      return detectAnimals(attachment.url).then((result) => {
        log.debug(`Detected animals: ${JSON.stringify(result)}`);
        const customCatEmoji = msg.client.emojis.cache.get('859179282886688778');
        const customDogEmoji = msg.client.emojis.cache.get('814619367852867625');
        const catEmoji = customCatEmoji ? customCatEmoji : '🐱';
        const dogEmoji = customDogEmoji ? customDogEmoji : '🐶';
        // If cat react with a cat emoji, if dog react with a dog emoji
        // Use the custom emojis if available, otherwise use the unicode emojis
        if (result.hasCat) {
          msg.react(catEmoji).catch((err) => {
            log.error(`Failed to react with cat emoji: ${err}`);
          });
        }
        if (result.hasDog) {
          msg.react(dogEmoji).catch((err) => {
            log.error(`Failed to react with dog emoji: ${err}`);
          });
        }
      });
    }
  }
}
