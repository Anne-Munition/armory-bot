import * as Discord from 'discord.js';
import { ChannelType, Snowflake, TextChannel } from 'discord.js';
import { getId } from './config.js';
import Timeout from './database/services/timeout_service.js';
import client from './discord.js';
import log from './logger.js';

// Get the timeout docs from the database and start timers to remove the timeout
export async function init(): Promise<void> {
  log.debug('init timeouts module');
  const timeouts = await Timeout.list();
  log.debug(`${timeouts.length} existing timeouts`);
  setInterval(checkTimeouts, 1000 * 60);
}

// Add a timeout to the database and start a timeout removal timer
export async function add(
  member: Discord.GuildMember,
  guildId: Snowflake,
  channelId: Snowflake,
  ms: number,
  username: string,
  reason: string,
): Promise<void> {
  // Save first so a failed save can't leave the role on with nothing to remove it
  await Timeout.add(member.id, guildId, channelId, ms, username);
  try {
    await addRole(member, getId(guildId, 'muteRole'), reason);
  } catch (err) {
    const doc = await Timeout.get(member.id, guildId);
    if (doc) await Timeout.remove(doc._id.toString());
    throw err;
  }
}

// Check for expired timeouts
async function checkTimeouts(): Promise<void> {
  const timeouts = await Timeout.list();
  timeouts.forEach((timeout) => {
    if (Date.now() >= new Date(timeout.expires_at).valueOf()) {
      remove(timeout.user_id, timeout.guild_id).catch((err) =>
        log.error(`Unable to remove timeout on ${timeout.user_id}: ${err?.message}`),
      );
    }
  });
}

// Remove the timeout either manually or from the timer
export async function remove(userId: Snowflake, guildId: Snowflake, manual = false): Promise<void> {
  log.debug(`removing timeout on: ${userId} in ${guildId}`);
  const timeoutDoc = await Timeout.get(userId, guildId);
  if (!timeoutDoc) return;
  await Timeout.remove(timeoutDoc._id.toString());

  const guild = client.guilds.cache.get(timeoutDoc.guild_id);
  if (!guild) return;

  // fetch throws rather than returning null when the user is no longer a member
  const member = await guild.members.fetch(timeoutDoc.user_id).catch(() => null);
  let response: string;
  if (member) {
    response = `The timeout has expired for ${member}.`;
    const reason = manual ? 'Timeout manually removed' : 'The timeout has expired.';
    await removeRole(member, timeoutDoc.roles, reason);
  } else {
    response = `The timeout has expired for ${timeoutDoc.username}.\nThough they seem to no longer be a member of this guild.`;
  }

  if (manual) return;
  // Only skip the announcement if the channel is gone, the role is already removed above
  const channel = guild.channels.cache.get(timeoutDoc.channel_id);
  if (!channel || channel.type !== ChannelType.GuildText) return;
  await (channel as TextChannel).send(response);
}

export async function addRole(
  member: Discord.GuildMember,
  roles: Snowflake | Snowflake[] | null,
  reason: string,
) {
  if (!roles) return;
  await member.roles.add(roles, reason);
}

async function removeRole(
  member: Discord.GuildMember,
  roles: Snowflake | Snowflake[],
  reason: string,
) {
  await member.roles.remove(roles, reason);
}
