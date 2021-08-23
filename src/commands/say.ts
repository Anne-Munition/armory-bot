export const info: CmdInfo = {
  global: true,
  defaultPermission: false,
  editablePermissions: true,
}

export const structure: CmdStructure = {
  name: 'say',
  description: 'Post a message as Becky.',
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
  const chanToPostIn = channel || interaction.channel
  if (!chanToPostIn) {
    await interaction.reply('Unable to get channel.')
    return
  }
  if (
    chanToPostIn.type !== 'GUILD_PUBLIC_THREAD' &&
    chanToPostIn.type !== 'GUILD_TEXT'
  ) {
    return
  }
  if (chanToPostIn.isText() || chanToPostIn.isThread()) {
    await chanToPostIn.send(message)
    await interaction.reply({ content: 'Done', ephemeral: true })
  } else {
    await interaction.reply({
      content:
        'Unable to post in this channel.\nOnly guild text and public thread channels are valid.',
      ephemeral: true,
    })
  }
}
