import { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import humanizeDuration from 'humanize-duration';
import { Duration } from 'luxon';
import { ids } from '../config.js';
import Timeout from '../database/services/timeout_service.js';
import * as timeouts from '../timeouts.js';
import { ignore } from '../utilities.js';

const MAX_DURATION_MS = Duration.fromObject({ years: 5 }).toMillis();

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'timeout',
  description: 'Give a user the muted role for a duration of time.',
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  dmPermission: false,
  options: [
    {
      name: 'list',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'List the active timeouts.',
    },
    {
      name: 'add',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Add a timeout to a user.',
      options: [
        {
          name: 'user',
          type: ApplicationCommandOptionType.User,
          description: 'Who to give the muted role to.',
          required: true,
        },
        {
          name: 'duration',
          type: ApplicationCommandOptionType.Number,
          description: 'Duration user will keep the muted role.',
          required: true,
          minValue: 1,
        },
        {
          name: 'unit',
          type: ApplicationCommandOptionType.String,
          description: 'Unit of time.',
          required: true,
          choices: [
            {
              name: 'Minutes',
              value: 'minutes',
            },
            {
              name: 'Hours',
              value: 'hours',
            },
            {
              name: 'Days',
              value: 'days',
            },
          ],
        },
        {
          name: 'reason',
          type: ApplicationCommandOptionType.String,
          description: 'Optional reason the user was timed out.',
        },
      ],
    },
    {
      name: 'remove',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Remove a timeout from a user.',
      options: [
        {
          name: 'user',
          type: ApplicationCommandOptionType.User,
          description: 'Who to remove the muted role from.',
          required: true,
        },
      ],
    },
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  // Enforce in code too, guild admins can override the default command permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({
      content: 'You need the Timeout Members permission to use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();
  const guildId = interaction.guild?.id;
  if (!guildId) throw new Error('Unable to get guild id.');

  const subCommand = interaction.options.getSubcommand(true) as 'list' | 'add' | 'remove';

  if (subCommand === 'list') {
    const activeTimeouts = await Timeout.list(guildId);
    if (!activeTimeouts.length) {
      await interaction.editReply('There are no active timeouts.');
      return;
    }
    // Fetch all users to be available in cache
    for (let i = 0; i < activeTimeouts.length; i++) {
      const item = activeTimeouts[i];
      if (!item) continue;
      // Deleted accounts can't be fetched, they'll show as their stored username instead
      await interaction.client.users.fetch(item.user_id).catch(ignore);
    }
    const response = activeTimeouts.map((timeoutDoc) => {
      const user = interaction.client.users.cache.get(timeoutDoc.user_id);
      return `${user ?? timeoutDoc.username} - Expires at: ${getExpiry(timeoutDoc.expires_at)}.`;
    });
    // Stay under Discord's 2000 character message limit
    const lines: string[] = [];
    let length = 0;
    for (const line of response) {
      if (length + line.length + 1 > 1900) {
        lines.push(`...and ${response.length - lines.length} more.`);
        break;
      }
      lines.push(line);
      length += line.length + 1;
    }
    await interaction.editReply(lines.join('\n'));
    return;
  } else {
    // Make sure the client can update roles in the guild
    const clientUserId = interaction.client.user?.id;
    if (!clientUserId) throw new Error('Unable to get the client user id.');
    const clientMember = await interaction.guild?.members.fetch(clientUserId);
    if (!clientMember) throw new Error('Unable to get the client member.');
    const botPerms = clientMember.permissions;

    if (!botPerms.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply('Unable to edit roles in this guild.');
      return;
    }

    const target = interaction.options.getUser('user', true);
    // fetch throws rather than returning null when the user is not a member
    const member = await interaction.guild?.members.fetch(target.id).catch(() => null);
    const existing = await Timeout.get(target.id, guildId);

    // Allow clearing a timeout for a user that has since left the guild
    if (!member && !(subCommand === 'remove' && existing)) {
      await interaction.editReply('Unable to locate target member.');
      return;
    }

    if (member) {
      // Prevent timing out members with an equal or higher role than the caller
      const caller = await interaction.guild?.members.fetch(interaction.user.id);
      if (!caller) throw new Error('Unable to get the caller member.');
      const isGuildOwner = interaction.guild?.ownerId === caller.id;
      if (!isGuildOwner && member.roles.highest.comparePositionTo(caller.roles.highest) >= 0) {
        await interaction.editReply(`You cannot manage timeouts for ${member}.`);
        return;
      }
    }

    if (subCommand === 'add' && member) {
      const targetString = `**${member.user.tag}** (${member.user.id})`;
      const duration = interaction.options.getNumber('duration', true);
      const unit = interaction.options.getString('unit', true) as 'minutes' | 'hours' | 'days';
      const reason = interaction.options.getString('reason');

      if (existing) {
        await interaction.editReply(
          `A timeout is already in place for ${member}.\nExpires at: ${getExpiry(
            existing.expires_at,
          )}.`,
        );
        return;
      }

      const unitString = duration === 1 ? unit.slice(0, -1) : unit;
      let reply = `${member} has been timed out for **${duration}** ${unitString}.`;
      let auditReason = `Timed out by ${interaction.user.username} for ${duration} ${unitString}`;
      if (reason) {
        reply += `\nReason: ${reason}`;
        auditReason += ` for: ${reason}`;
      }
      const ms = Duration.fromObject({ [unit]: duration }).toMillis();
      if (!Number.isFinite(ms) || ms > MAX_DURATION_MS) {
        await interaction.editReply('Timeouts cannot be longer than 5 years.');
        return;
      }

      await timeouts.add(member, guildId, interaction.channelId, ms, targetString, auditReason);
      await interaction.editReply(reply);
    } else if (subCommand === 'remove') {
      if (!existing) {
        await interaction.editReply(`${target} is not currently under a timeout.`);
        return;
      }

      await timeouts.remove(target.id, guildId, true);
      await interaction.editReply(`Manually removed timeout on ${target}.`);
    }
  }
};

function getExpiry(date: Date): string {
  const iso = new Date(date).toISOString();
  const duration = Duration.fromMillis(new Date(date).valueOf() - new Date().valueOf());
  return `\`\`${iso}\`\` - ${humanizeDuration(duration.toMillis())}`;
}
