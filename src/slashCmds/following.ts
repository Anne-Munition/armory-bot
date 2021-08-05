import { getFollows, getUsers } from '../twitch/twitch_api'
import { displayName, formatTimeDiff } from '../utilities'

export const info: SlashCmdInfo = {
  global: true,
}

export const commandData: SlashCommandData = {
  name: 'following',
  description: 'Get Twitch following time for a user / channel.',
  options: [
    {
      name: 'user',
      type: 'STRING',
      description: 'Twitch user / viewer name.',
      required: true,
    },
    {
      name: 'channel',
      type: 'STRING',
      description: 'Twitch channel / stream name.',
      required: true,
    },
  ],
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.defer()

  const user = interaction.options.getString('user', true).toLowerCase()
  const channel = interaction.options.getString('channel', true).toLowerCase()

  const usersData = await getUsers([user, channel])

  const userData = usersData.find((x) => x.login === user)
  const channelData = usersData.find((x) => x.login === channel)

  if (!userData) {
    await interaction.editReply({
      content: `**${user}** is not a registered Twitch channel.`,
    })
    return
  } else if (!channelData) {
    await interaction.editReply({
      content: `**${channel}** is not a registered Twitch channel.`,
    })
    return
  }
  // Get localized display_names
  const nameA = displayName(userData)
  const nameB = displayName(channelData)

  // Get following data
  const [followData] = await getFollows(userData.id, channelData.id)

  // Not Following
  if (!followData) {
    await interaction.editReply(`**${nameA}** does not follow **${nameB}**`)
    return
  }
  // Is Following
  await interaction.editReply(
    `**${nameA}** has been following **${nameB}** since: ` +
      `\`\`${followData.followed_at}\`\`\n${formatTimeDiff(
        followData.followed_at,
      )}`,
  )
}
