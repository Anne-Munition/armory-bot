import { EmojiIdentifierResolvable, Message } from 'discord.js';
import detectAnimals from '../catdog_detection.js';
import { getId } from '../config.js';
import log from '../logger.js';

// Reaction order follows this list
const ANIMAL_EMOJIS: Record<string, { fallback: string; custom?: string }> = {
  cat: { fallback: '🐱', custom: 'becky4' },
  dog: { fallback: '🐶', custom: 'becky5' },
  bird: { fallback: '🐦' },
  horse: { fallback: '🐴' },
  sheep: { fallback: '🐑' },
  cow: { fallback: '🐮' },
  elephant: { fallback: '🐘' },
  bear: { fallback: '🐻' },
  zebra: { fallback: '🦓' },
  giraffe: { fallback: '🦒' },
};

async function react(msg: Message, animal: string) {
  const { fallback, custom } = ANIMAL_EMOJIS[animal] ?? { fallback: '🐾' };
  const emoji: EmojiIdentifierResolvable =
    (custom && msg.client.emojis.cache.find((e) => e.name === custom)) || fallback;
  try {
    await msg.react(emoji);
  } catch {
    if (emoji === fallback) throw new Error(`Failed to react with ${animal} emoji`);
    await msg.react(fallback);
  }
}

export default async function (msg: Message) {
  if (msg.guildId && msg.channel.id !== getId(msg.guildId, 'animalDetectionChannelId')) return;

  const images = msg.attachments.filter((a) => a.contentType?.startsWith('image/') ?? true);
  if (images.size === 0) return;

  const animals = new Set<string>();
  for (const attachment of images.values()) {
    log.debug(`Detecting animals in image: ${attachment.url}`);
    try {
      const result = await detectAnimals(attachment.url);
      for (const animal of result.keys()) animals.add(animal);
    } catch (err) {
      log.error(`Animal detection failed for ${attachment.url}: ${err}`);
    }
  }
  log.debug(`Detected animals: ${[...animals].join(', ') || 'none'}`);

  const ordered = Object.keys(ANIMAL_EMOJIS).filter((a) => animals.has(a));
  for (const animal of ordered) {
    await react(msg, animal).catch((err) => log.error(String(err)));
  }
}
