import axios from 'axios';
import { Message } from 'discord.js';
import { getId } from '../config.js';

const reg = /https?:\/\/(([vf]x)?twitter).com/;
export default async function (msg: Message): Promise<boolean> {
  if (msg.guildId && msg.channel.id === getId(msg.guildId, 'scheduleChannel')) {
    const pinnedMessages = await msg.channel.messages.fetchPinned();
    if (contentHasScheduleTerms(msg.content)) {
      if (pinnedMessages.size) pinnedMessages.forEach((x) => x.unpin());
      await msg.pin();
      return true;
    } else if (reg.test(msg.content)) {
      const matches = msg.content.match(reg) || [];
      if (!matches[1]) return false;
      const url = msg.content.replace(matches[1], 'api.vxtwitter');
      const index = url.indexOf('?');
      const trimmedUrl = url.substring(0, index);
      axios
        .get(trimmedUrl)
        .then(async ({ data }) => {
          if (contentHasScheduleTerms(data.text)) {
            if (pinnedMessages.size) pinnedMessages.forEach((x) => x.unpin());
            await msg.pin();
            return true;
          }
        })
        .then(() => {
          return false;
        });
    }
  }
  return false;
}

function contentHasScheduleTerms(text: string): boolean {
  return text.includes('SCHEDULE');
}
