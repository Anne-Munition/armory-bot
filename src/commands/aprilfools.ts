import { ids } from '../config';
import { ApplicationCommandOptionType, PermissionFlagsBits, MessageFlags } from 'discord.js';

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
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const subCommand = interaction.options.getSubcommand(true) as 'enable' | 'disable';
  const guild = interaction.guild;

  if (!guild) {
    await interaction.reply({
      content: 'This command can only be run in a guild.',
      flags: MessageFlags.Ephemeral, // Use flags instead of ephemeral
    });
    return;
  }

  // Defer the interaction to avoid timeout
  await interaction.deferReply();

  if (subCommand === 'enable') {
    enabled = true;
    nicknameMap.clear(); // Clear the map before starting
    await interaction.editReply('Starting the fun! Changing nicknames to "Anne Munition"...');

    const members = await guild.members.fetch();
    for (const member of members.values()) {
      if (!member.manageable) continue;

      let success = false;
      while (!success) {
        try {
          // Store the original nickname
          if (member.nickname !== 'Anne Munition') {
            nicknameMap.set(member.id, member.nickname || '');
          }

          // Set the new nickname
          await member.setNickname('Anne Munition');
          success = true; // Exit the retry loop if successful
        } catch (error: any) {
          if (error.code === 429) {
            // Handle rate limit
            const retryAfter = error.retry_after || 1000; // Default to 1 second if not provided
            console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
          } else {
            console.error(`Failed to set nickname for ${member.user.tag}:`, error);
            break; // Exit the retry loop on non-rate-limit errors
          }
        }
      }

      // Custom rate limiter: Wait 250 ms between requests
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const botMember = await guild.members.fetch(interaction.client.user!.id);
    if (botMember) {
      nicknameMap.set(botMember.id, botMember.nickname || '');
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
          // Revert to the original nickname
          await member.setNickname(originalNickname);
          success = true; // Exit the retry loop if successful
        } catch (error: any) {
          if (error.code === 429) {
            // Handle rate limit
            const retryAfter = error.retry_after || 1000; // Default to 1 second if not provided
            console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryAfter));
          } else {
            console.error(`Failed to revert nickname for ${member.user.tag}:`, error);
            break; // Exit the retry loop on non-rate-limit errors
          }
        }
      }

      // Custom rate limiter: Wait 250 ms between requests
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const botMember = await guild.members.fetch(interaction.client.user!.id);
    if (botMember) {
      const originalNickname = nicknameMap.get(botMember.id);
      if (originalNickname !== undefined) {
        await botMember.setNickname(originalNickname);
      }
    }

    nicknameMap.clear(); // Clear the map after reverting
    await interaction.followUp('All nicknames have been reverted!');
  }
};

export function isEnabled(): boolean {
  return enabled;
}
