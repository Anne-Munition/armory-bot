import { ApplicationCommandOptionType } from 'discord.js';
import { ids } from '../config';
import * as twitch from '../twitch/twitch_api';
import { capitalize, displayName } from '../utilities';

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
};

export const structure: CmdStructure = {
  name: 'twitchinfo',
  description: 'Get the subscription status of a Twitch viewer by name or id.',
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
