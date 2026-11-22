import { ApplicationCommandOptionType } from 'discord.js';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'avatar',
  description: "Embed a user's avatar.",
  options: [
    {
      name: 'user',
      type: ApplicationCommandOptionType.User,
      description: 'Whose avatar to embed, defaults to you.',
    },
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const user = interaction.options.getUser('user') ?? interaction.user;
  await interaction.reply({ files: [user.displayAvatarURL({ size: 1024 })] });
};
