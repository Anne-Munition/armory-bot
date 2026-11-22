import { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { ids } from '../config.js';
import * as twitch from '../twitch/twitch_api.js';
import { capitalize, displayName } from '../utilities.js';

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'twitchinfo',
  description: 'Get the subscription status of a Twitch viewer by name or id.',
  defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
  dmPermission: false,
  options: [
    {
      name: 'viewer',
      type: ApplicationCommandOptionType.String,
      description: 'Twitch user login or ID.',
      required: true,
    },
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  // Enforce in code too, guild admins can override the default command permissions
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({
      content: 'Only moderators can use this command.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();
  const viewer = interaction.options.getString('viewer', true);
  const [user] = await twitch.getUsers([viewer]);
  if (!user) {
    await interaction.editReply(`The Twitch channel **${viewer}** does not exist.`);
    return;
  }

  const subscription = await twitch.getSubscription(user.id);
  const name = displayName(user);

  let str = /^\d+$/.test(viewer) ? `${user.id} => **${name}**` : `${name} => **${user.id}**`;
  if (user.broadcaster_type) str += `\n${capitalize(user.broadcaster_type)}`;
  str += `\nSubscribed: **${Boolean(subscription.length)}**`;
  await interaction.editReply(str);
};
