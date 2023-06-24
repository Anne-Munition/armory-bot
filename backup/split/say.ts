import { ApplicationCommandOptionType, ChannelType } from 'discord.js'

export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'say',
  description: 'Post a message as the bot.',
  options: [
    {
      name: 'message',
      type: ApplicationCommandOptionType.String,
      description: 'The message to post.',
      required: true,
    },
    {
      name: 'channel',
      type: ApplicationCommandOptionType.Channel,
      description: 'Optional channel to post in.',
    },
  ],
}

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const message = interaction.options.getString('message', true)
  const channel = interaction.options.getChannel('channel') ?? interaction.channel
  if (!channel) {
    await interaction.reply('Unable to get channel.')
    return
  }
  if (channel.type === ChannelType.GuildText) {
    await channel.send(message)
    await interaction.reply({ content: 'Done', ephemeral: true })
  } else {
    await interaction.reply({
      content: 'Cannot ``/say`` in the specified channel.',
      ephemeral: true,
    })
  }
}
