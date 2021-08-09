export const info: SlashInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
}

export const permissions: SlashPerms = [
  {
    id: '84778943529365504', // Moderators - Armory
    type: 'ROLE',
    permission: true,
  },
  {
    id: '140025967044198400', // Moderators - DBKynd
    type: 'ROLE',
    permission: true,
  },
]

export const commandData: SlashData = {
  name: 'say',
  defaultPermission: false,
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

export const run: SlashRun = async (interaction): Promise<void> => {
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
