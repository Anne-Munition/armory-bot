import { Message } from 'discord.js';
import emojiRegex from 'emoji-regex';
import { getId } from '../config';

const reg = /^(.|\n)+\|\|(.|\n)*\|\|(.|\n)*$/;

export default async function (msg: Message): Promise<void> {
  if (msg.guildId && msg.channel.id !== getId(msg.guildId, 'spoilerChannel')) return;

  const attachments = msg.attachments;

  if (
    !attachments.size &&
    msg.content
      .replace(/<(.*)?:.+:\d+>/g, '')
      .replace(emojiRegex(), '')
      .trim().length === 0
  )
    return;

  const hasUntagged = attachments.filter((x) => !x.spoiler);
  if (hasUntagged.size) {
    await del(msg);
    await msg.reply({
      content: `${msg.author} Please 'Mark as spoiler' on all attachments. Thanks!`,
      allowedMentions: { users: [msg.author.id] },
    });
    return;
  }

  if (attachments.size && !msg.content) {
    await del(msg);
    await msg.channel.send({
      content: `${msg.author} Please add a topic comment to your attachments. Thanks!`,
      allowedMentions: { users: [msg.author.id] },
    });
    return;
  }

  if (
    (attachments.size && msg.content.length > 50 && !reg.test(msg.content)) ||
    (!attachments.size && !reg.test(msg.content))
  ) {
    await del(msg);
    await msg.channel.send({
      content: `${msg.author} Please use the format: \`\`topic ||spoiler||\`\`. Thanks!`,
      allowedMentions: { users: [msg.author.id] },
    });
  }
}

async function del(msg: Message) {
  await msg.delete();
  const author = msg.author;
  try {
    if (msg.content) await author.send(`\`\`\`Removed from spoiler-zone\`\`\`${msg.content}`);
  } catch (e) {
    // Do Nothing
  }
}
