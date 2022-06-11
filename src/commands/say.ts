export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'say',
  description: 'Post a message as the bot.',
  options: [
    {
      name: 'message',
      type: 'STRING',
      description: 'The message to post.',
      required: true,
    },
    {
      name: 'channel',
      type: 'CHANNEL',
      description: 'Optional channel to post in.',
    },
  ],
}

export const run: CmdRun = async (interaction): Promise<void> => {
  const message = interaction.options.getString('message', true)
  const channel = interaction.options.getChannel('channel')
  const targetChannel = channel || interaction.channel
  if (!targetChannel) {
    await interaction.reply('Unable to get channel.')
    return
  }
  if (targetChannel.type !== 'GUILD_PUBLIC_THREAD' && targetChannel.type !== 'GUILD_TEXT') {
    await interaction.reply({
      content: 'Cannot ``/say`` in the specified channel.',
      ephemeral: true,
    })
  } else {
    await targetChannel.send(message)
    await interaction.reply({ content: 'Done', ephemeral: true })
  }
}
