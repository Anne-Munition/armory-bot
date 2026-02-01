import { Message } from 'discord.js';
import { getId } from '../config.js';

export default async function (msg: Message): Promise<boolean> {
  if (
    msg.guildId &&
    msg.channel.id === getId(msg.guildId, 'scheduleChannel') &&
    msg.author.id === '1343656685943918642' // r/AnneMunition bot ID
  ) {
    if (contentHasScheduleTerms(msg.content)) {
      const pinnedMessages = await msg.channel.messages.fetchPinned();
      if (pinnedMessages.size) {
        pinnedMessages.forEach((x) => {
          if (contentHasScheduleTerms(x.content)) x.unpin();
        });
      }
      await msg.pin();
      return true;
    }
  }
  return false;
}

function contentHasScheduleTerms(text: string): boolean {
  return text.includes('SCHEDULE');
}
