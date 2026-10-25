import { CronJob } from 'cron';
import * as Discord from 'discord.js';
import { ChannelType } from 'discord.js';
import { DateTime } from 'luxon';
import * as config from './config.js';
import Birthday from './database/services/birthday_service.js';
import client from './discord.js';
import logger from './logger.js';

const cronTime = process.env.NODE_ENV === 'production' ? '0 8 * * *' : '*/1 * * * *';

function init() {
  new CronJob(cronTime, run, null, true, 'America/New_York');
}

async function run() {
  if (!client) return;
  const guildId = config.getGuildId();
  const channelId = config.getId(guildId, 'birthdayAnnouncementChannelId');
  const birthdayRoleId = config.getId(guildId, 'birthdayRoleId');
  if (!guildId || !channelId || !birthdayRoleId) return;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  const channel = guild.channels.cache.get(channelId);
  const birthdayRole = guild.roles.cache.get(birthdayRoleId);
  if (!channel || channel.type !== ChannelType.GuildText || !birthdayRole) return;

  // Remove any pinned birthday messages
  const pinnedMessages = await channel.messages.fetchPinned();
  if (pinnedMessages.size)
    pinnedMessages
      .filter((x) => x.content.startsWith(':birthday: **Happy Birthday!** :birthday:'))
      .forEach((x) => x.unpin());

  // Remove all birthday roles
  birthdayRole.members.forEach((x) => {
    x.roles.remove(birthdayRole).catch(() => {
      // Do Nothing
    });
  });

  // Search database for people with birthdays today
  const today = getTodayDate();
  const dates = [today];
  // Celebrate Feb 29 birthdays on Feb 28 in non-leap years
  if (today === '02/28' && !DateTime.now().toUTC().isInLeapYear) dates.push('02/29');
  const birthdayDocs = await Birthday.get(dates);
  logger.debug(`Birthday docs: ${dates.join(', ')} - ${birthdayDocs.length}`);

  const members: Discord.GuildMember[] = [];
  for (let i = 0; i < birthdayDocs.length; i++) {
    const discordId = birthdayDocs[i]?.discord_id;
    if (!discordId) continue;
    // Members who left the guild make fetch throw, skip them instead of aborting the run
    const m = await guild.members.fetch(discordId).catch(() => null);
    if (m) {
      if (m.roles.cache.has(birthdayRole.id)) continue;
      // Assign birthday roles
      m.roles.add(birthdayRole).catch(() => {
        // Do Nothing
      });
      members.push(m);
    }
  }

  if (!members.length) return;

  // Announce birthdays
  const message = `:birthday: **Happy Birthday!** :birthday:\n\n ${members
    .map((x) => `<@${x.id}>`)
    .join('\n')}`;
  const msg = await channel.send({
    content: message,
    options: { allowedMentions: { parse: ['users'] } },
  });
  await msg.pin();
}

export default init;

export function getTodayDate(): string {
  return DateTime.now().toUTC().toFormat('MM/dd');
}
