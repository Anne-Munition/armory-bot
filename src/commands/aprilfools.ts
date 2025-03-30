import { existsSync, readFileSync } from 'fs';
import fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import {
  ApplicationCommandOptionType,
  Guild,
  GuildMember,
  Message,
  MessageFlags,
} from 'discord.js';
import { ids } from '../config.js';
import { logDir } from '../directories.js';
import logger from '../logger.js';

const jsonFile = path.join(logDir, 'nicknames.json');
const nicknameMap = new Map<string, string>();
let enabled = false;
const NICK = 'Anne Munition';

export async function init() {
  if (!existsSync(jsonFile)) await saveJson();

  try {
    const data = readFileSync(jsonFile, 'utf-8');
    const parsedData = JSON.parse(data);
    enabled = parsedData.enabled || false;
    for (const [key, value] of Object.entries(parsedData.nicknames || {})) {
      nicknameMap.set(key, value as string);
    }
    logger.info(`Loaded ${nicknameMap.size} nicknames from file`);
    logger.info(`The April Fools's event is: ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('Failed to read or parse the nickname JSON file:', error);
  }
}

init();

export async function saveJson(): Promise<void> {
  return fs.writeFile(
    jsonFile,
    JSON.stringify(
      {
        enabled,
        nicknames: Object.fromEntries(nicknameMap),
      },
      null,
      2,
    ),
    'utf-8',
  );
}

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'aprilfools',
  description: "April Fool's controller.",
  options: [
    {
      name: 'map',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Map action.',
    },
    {
      name: 'enable',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Enable the April Fool’s event.',
    },
    {
      name: 'disable',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Disable the April Fool’s event.',
    },
    {
      name: 'revert',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Revert the April Fool’s event changes.',
    },
  ],
};

async function mapNicknames(guild: Guild): Promise<{ size: number; location: string }> {
  const map = new Map<string, string>();
  const members = await guild.members.fetch();

  for (const member of members.values()) {
    map.set(member.id, member.nickname || '');
  }
  const botMember = await guild.members.fetch(guild.client.user!.id);
  if (botMember) map.set(botMember.id, botMember.nickname || '');

  // Save the nickname map to a JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `nicknames-${timestamp}.json`;
  const filePath = path.join(logDir, fileName);
  const nicknameObject = Object.fromEntries(map);
  await fs.writeFile(filePath, JSON.stringify(nicknameObject, null, 2), 'utf-8');

  return { size: map.size, location: fileName };
}

async function setEveryoneRolePermissions(
  guild: Guild,
  allowNicknameChange: boolean,
): Promise<void> {
  const everyoneRole = guild.roles.everyone;
  const currentPermissions = everyoneRole.permissions;

  const updatedPermissions = allowNicknameChange
    ? currentPermissions.add('ChangeNickname')
    : currentPermissions.remove('ChangeNickname');

  await everyoneRole.setPermissions(updatedPermissions);
}

async function restoreNicknames(guild: Guild): Promise<void> {
  const members = await guild.members.fetch();

  for (const member of members.values()) {
    if (!member.manageable) continue;

    const originalNickname = nicknameMap.get(member.id);
    if (originalNickname === undefined) continue;

    await setNicknameWithRateLimit(member, originalNickname);
  }

  nicknameMap.clear();
}

// Fetch rate limit headers once to calculate a consistent delay
let delay: number | undefined;
let retries = 0;
const maxRetries = 5;

async function setNicknameWithRateLimit(member: GuildMember, nickname: string): Promise<void> {
  const endpoint = `https://discord.com/api/v10/guilds/${member.guild.id}/members/${member.id}`;
  const token = member.client.token;

  let success = false;

  while (!success && retries < maxRetries) {
    try {
      const response = await axios.patch(
        endpoint,
        { nick: nickname },
        {
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const rateLimitLimit = response.headers['x-ratelimit-limit'];
      const rateLimitResetAfter = response.headers['x-ratelimit-reset-after'];

      if (
        rateLimitLimit !== undefined &&
        rateLimitResetAfter !== undefined &&
        delay === undefined
      ) {
        const totalLimit = parseInt(rateLimitLimit, 10);
        const resetAfter = parseFloat(rateLimitResetAfter) * 1000;
        const safeLimit = Math.floor(0.9 * totalLimit);
        delay = resetAfter / safeLimit;
      }

      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      success = true;
    } catch (error: any) {
      retries++;
      if (retries >= maxRetries) {
        logger.error(`Max retries reached for ${member.user.tag}:`, error);
        break;
      }
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retry_after || 1000;
        logger.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryAfter));
      } else {
        logger.error(`Failed to set nickname for ${member.user.tag}:`, error);
        break;
      }
    }
  }
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const subCommand = interaction.options.getSubcommand(true) as
    | 'map'
    | 'enable'
    | 'disable'
    | 'revert';
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: 'This command can only be run in a guild.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (subCommand === 'map') {
    const { size, location } = await mapNicknames(guild);
    await interaction.reply(`\`${size}\` Nicknames have been mapped and saved to: \`${location}\``);
  } else if (subCommand === 'enable') {
    enabled = true;
    await saveJson();
    await setEveryoneRolePermissions(guild, false); // Disable nickname changes for @everyone
    await interaction.reply('April Fool’s event enabled. Let the fun commence!');
  } else if (subCommand === 'disable') {
    enabled = false;
    await saveJson();
    await setEveryoneRolePermissions(guild, true); // Re-enable nickname changes for @everyone
    await interaction.reply('April Fool’s event disabled.');
  } else if (subCommand === 'revert') {
    await interaction.deferReply();
    await interaction.editReply(`Reverting \`${nicknameMap.size}\` nicknames...`);
    await restoreNicknames(guild); // Restore original nicknames
    await interaction.editReply(`\`${nicknameMap.size}\` nicknames have been restored.`);
  }
};

export function isEnabled(): boolean {
  return enabled;
}

export async function handleMessage(message: Message) {
  if (!enabled) return;
  const member = message.member;
  if (!member || !member.manageable) return;

  try {
    const currentNickname = member.nickname || '';
    if (currentNickname !== NICK) {
      nicknameMap.set(member.id, currentNickname);

      await member.setNickname(NICK);
      await saveJson();
    }
  } catch (err) {
    logger.error(`Unable to change nickname for: ${member.user.username}`, err);
  }
}
