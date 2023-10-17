import { Message } from 'discord.js';
import { getId } from '../config';

export default async function (msg: Message): Promise<boolean> {
  if (msg.guildId && msg.channel.id === getId(msg.guildId, 'scheduleChannel')) {
    if (contentHasScheduleTerms(msg)) {
      const pinnedMessages = await msg.channel.messages.fetchPinned();
      if (pinnedMessages.size)
        pinnedMessages.forEach((x) => {
          if (contentHasScheduleTerms(x)) x.unpin();
        });
      await msg.pin();
      return true;
    }
  }
  return false;
}

function contentHasScheduleTerms(msg: Message): boolean {
  return msg.content.includes('SCHEDULE');
}
