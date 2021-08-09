import axios from 'axios'
import Discord from 'discord.js'
import { displayName } from '../utilities'

export const info: SlashInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
}

export const commandData: SlashData = {
  name: 'whatnow',
  description: "List Anne's subscribers who are currently live.",
}

export const run: SlashRun = async (interaction): Promise<void> => {
  const liveSubs: LiveSubs = await axios
    .get('https://info.annemunition.tv/getLiveSubs')
    .then(({ data }) => data)

  if (!liveSubs) {
    await interaction.reply({
      content: 'Unable to get a valid response.',
      ephemeral: true,
    })
    return
  }

  if (!liveSubs.length) {
    await interaction.reply('No subs are currently live.')
    return
  }

  await interaction.deferReply({ ephemeral: true })

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
      await interaction.followUp(split[i])
    }
  }
}
