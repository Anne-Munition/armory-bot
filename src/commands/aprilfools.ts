import * as fs from 'fs';
import * as path from 'path';
import { ApplicationCommandOptionType, Guild, MessageFlags } from 'discord.js';
import { ids } from '../config.js';
import { logDir } from '../directories.js';
import logger from '../logger.js';

const nicknameMap = new Map<string, string>(); // Map to store member IDs and their original nicknames
let enabled = false;

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'aprilfools',
  description: "April Fool's controller.",
  options: [
    {
      name: 'enable',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Let the fun commence.',
    },
    {
      name: 'disable',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Aww... no fun.',
    },
    {
      name: 'map',
      type: ApplicationCommandOptionType.Subcommand,
      description: 'Only map and save nicknames.',
    },
  ],
};

async function mapNicknames(guild: Guild): Promise<void> {
  nicknameMap.clear();
  const members = await guild.members.fetch();

  for (const member of members.values()) {
    if (!member.manageable) continue;
    nicknameMap.set(member.id, member.nickname || '');
  }

  const botMember = await guild.members.fetch(guild.client.user!.id);
  if (botMember) {
    nicknameMap.set(botMember.id, botMember.nickname || '');
  }

  // Save the nickname map to a JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format timestamp for filename
  const filePath = path.join(logDir, `nicknameMap-${timestamp}.json`);
  const nicknameObject = Object.fromEntries(nicknameMap); // Convert Map to plain object
  fs.writeFileSync(filePath, JSON.stringify(nicknameObject, null, 2), 'utf-8');
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const subCommand = interaction.options.getSubcommand(true) as 'enable' | 'disable' | 'map';
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: 'This command can only be run in a guild.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  if (subCommand === 'map') {
    await mapNicknames(guild);
    await interaction.editReply('Nicknames have been mapped and saved!');
    return;
  }

  const botMember = await guild.members.fetch(interaction.client.user!.id);

  if (subCommand === 'enable') {
    enabled = true;
    await interaction.editReply('Starting the fun! Changing nicknames to "Anne Munition"...');

    await mapNicknames(guild); // Reuse the mapping logic

    const members = await guild.members.fetch();
    for (const member of members.values()) {
      if (!member.manageable) continue;

      let success = false;
      while (!success) {
        try {
          await member.setNickname('Anne Munition');
          success = true;
        } catch (error: any) {
          if (error.code === 429) {
            const retryAfter = error.retry_after || 1000;
            logger.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
          } else {
            logger.error(`Failed to set nickname for ${member.user.tag}:`, error);
            break;
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (botMember) {
      await botMember.setNickname('Anne Munition');
    }

    await interaction.followUp('All nicknames have been changed!');
  } else if (subCommand === 'disable') {
    enabled = false;
    await interaction.editReply('Reverting nicknames...');

    const members = await guild.members.fetch();
    for (const member of members.values()) {
      if (!member.manageable) continue;

      const originalNickname = nicknameMap.get(member.id);
      if (originalNickname === undefined) continue;

      let success = false;
      while (!success) {
        try {
          await member.setNickname(originalNickname);
          success = true;
        } catch (error: any) {
          if (error.code === 429) {
            const retryAfter = error.retry_after || 1000;
            logger.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
          } else {
            logger.error(`Failed to revert nickname for ${member.user.tag}:`, error);
            break;
          }
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (botMember) {
      const originalNickname = nicknameMap.get(botMember.id);
      if (originalNickname !== undefined) {
        await botMember.setNickname(originalNickname);
      }
    }

    nicknameMap.clear();
    await interaction.followUp('All nicknames have been reverted!');
  }
};

export function isEnabled(): boolean {
  return enabled;
}
