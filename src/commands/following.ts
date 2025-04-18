import { ApplicationCommandOptionType } from 'discord.js';
import { getFollows, getUsers } from '../twitch/twitch_api.js';
import { displayName, formatTimeDiff } from '../utilities.js';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'following',
  description: 'Get Twitch following time for a user / channel.',
  options: [
    {
      name: 'user',
      type: ApplicationCommandOptionType.String,
      description: 'Twitch user / viewer name.',
      required: true,
    },
    {
      name: 'channel',
      type: ApplicationCommandOptionType.String,
      description: 'Twitch channel / stream name.',
      required: true,
    },
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply();

  const user = interaction.options.getString('user', true).toLowerCase();
  const channel = interaction.options.getString('channel', true).toLowerCase();

  const usersData = await getUsers([user, channel]);

  const userData = usersData.find((x) => x.login === user);
  const channelData = usersData.find((x) => x.login === channel);

  if (!userData) {
    await interaction.editReply(`**${user}** is not a registered Twitch user.`);
    return;
  } else if (!channelData) {
    await interaction.editReply(`**${channel}** is not a registered Twitch channel.`);
    return;
  }

  // Get localized display_names
  const userName = displayName(userData);
  const channelName = displayName(channelData);

  // Get following data
  const [followData] = await getFollows(userData.id, channelData.id);

  // Not Following
  if (!followData) {
    await interaction.editReply(`**${userName}** does not follow **${channelName}**`);
    return;
  }
  // Is Following
  await interaction.editReply(
    `**${userName}** has been following **${channelName}** since: ` +
      `\`\`${followData.followed_at}\`\`\n${formatTimeDiff(followData.followed_at)}`,
  );
};
