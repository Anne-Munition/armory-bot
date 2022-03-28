import Discord from 'discord.js'

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
  name: 'topama',
  description: 'Link the top most up voted ama questions.',
  options: [
    {
      name: 'count',
      type: 'NUMBER',
      description: 'How many messages to link. Default 10',
      required: false,
    },
  ],
}

const commandChannelId =
  process.env.NODE_ENV === 'production'
    ? '85090217551204352'
    : '924727427865903114'
const amaChannelId =
  process.env.NODE_ENV === 'production'
    ? '957806150080938107'
    : '957826492304343050'

export const run: CmdRun = async (interaction): Promise<void> => {
  const channelId = interaction.channelId
  if (channelId !== commandChannelId) {
    await interaction.reply({
      content: `This command does not work in this channel.`,
      ephemeral: true,
    })
    return
  }
  await interaction.deferReply()
  const count = interaction.options.getNumber('count', false) || 10
  const guild = await interaction.guild
  if (!guild) return
  const amaChannel = (await guild.channels.fetch(
    amaChannelId,
  )) as Discord.TextChannel
  if (!amaChannel) return
  let messages: Discord.Collection<string, Discord.Message> =
    new Discord.Collection()

  async function fetchMessages(before?: string) {
    const m = await amaChannel.messages.fetch({ limit: 100, before })
    if (m.size !== 0) {
      messages = messages.concat(m)
      const key = m.firstKey()
      if (key) await fetchMessages(key)
    }
  }

  await fetchMessages()

  const upvotes: Discord.Collection<string, number> = new Discord.Collection()

  messages.forEach((x) => {
    if (!x.reactions.cache.size) return
    const up = x.reactions.cache.find((y) => y.emoji.name === '⬆️')?.count || 0
    if (!up) return
    upvotes.set(x.id, up)
  })

  upvotes.sort((a, b) => b - a)
  const t = Array.from(upvotes).slice(0, count)
  const slicedUpvotes = new Discord.Collection(t)

  await interaction.editReply({
    content: slicedUpvotes
      .map((count, id) => {
        const m = messages.get(id)
        if (!m) return null
        return `**${count}** ⬆️: <https://discord.com/channels/${interaction.guildId}/${amaChannelId}/${m.id}>`
      })
      .filter((x) => x)
      .join('/n'),
  })
}
