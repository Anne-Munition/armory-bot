import axios from 'axios'
import Discord from 'discord.js'
import { guildIds } from '../config'
import { displayName } from '../utilities'

export const info: CmdInfo = {
  global: false,
  guilds: [guildIds.armory, guildIds.dev],
}

export const structure: CmdStructure = {
  name: 'whatnow',
  description: "List Anne's subscribers who are currently live.",
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply({ ephemeral: true })

  const liveSubs: LiveSubs = await axios
    .get('https://info.annemunition.tv/getLiveSubs')
    .then(({ data }) => data)

  if (!liveSubs) {
    await interaction.editReply('Unable to get a valid response.')
    return
  }

  if (!liveSubs.length) {
    await interaction.editReply('No subs are currently live.')
    return
  }

  const strings = liveSubs
    // Sort by display_name
    .sort((a, b) => {
      const c = displayName(a.user).toLowerCase()
      const d = displayName(b.user).toLowerCase()
      if (c < d) return -1
      if (d < c) return 1
      return 0
    })
    .map((x) => {
      const status =
        x.title.length > 30 ? `${x.title.slice(0, 30)}...` : x.title
      return `[${displayName(x.user)}](<https://twitch.tv/${
        x.user_login
      }>): __${x.game.name}__ - ${status}`
    })

  const split = Discord.Util.splitMessage(
    `**${strings.length}** of Anne's subscribers are currently live.\n` +
      `<https://annemunition.tv/armory>\n\n${strings.join('\n')}`,
  )

  for (let i = 0; i < split.length; i++) {
    if (i === 0) {
      await interaction.editReply(split[i])
    } else {
      await interaction.followUp({ content: split[i], ephemeral: true })
    }
  }
}
