import Discord from 'discord.js'

export const info: CmdInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
}

export const structure: CmdStructure = {
  name: 'ama',
  description: 'Ask Anne a question.',
  options: [
    {
      name: 'question',
      type: 'STRING',
      description: 'What would you like to ask Anne?',
      required: true,
    },
  ],
}

const amaChannelId =
  process.env.NODE_ENV === 'production' ? '957806150080938107' : '957826492304343050'

export const run: CmdRun = async (interaction): Promise<void> => {
  const channelId = interaction.channelId
  if (channelId !== amaChannelId) {
    await interaction.reply({
      content: `This command only works in the <#${amaChannelId}> channel.`,
      ephemeral: true,
    })
    return
  }
  const question = interaction.options.getString('question', true)
  await interaction.reply(question)
  const message = (await interaction.fetchReply()) as Discord.Message
  await message.react('⬆️')
  await message.react('⬇️')
}
