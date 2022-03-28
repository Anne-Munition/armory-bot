import Discord from "discord.js";

export const info: CmdInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
  defaultPermission: true,
  editablePermissions: true,
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

export const run: CmdRun = async (interaction): Promise<void> => {
  const channelId = interaction.channelId
  if (channelId !== '957806150080938107') {
    await interaction.reply({
      content: `This command only works in the <#957806150080938107> channel.`,
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
