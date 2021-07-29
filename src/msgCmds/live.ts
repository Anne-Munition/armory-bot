import axios from 'axios'
import Discord from 'discord.js'
import { displayName } from '../utilities'

export const info: CmdInfo = {
  desc: "Posts Anne's subs who are currently live on Twitch.",
  usage: '',
  aliases: ['whatnow'],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  const liveSubs: LiveSubs = await axios
    .get('https://info.annemunition.tv/getLiveSubs')
    .then(({ data }) => data)

  if (!liveSubs) {
    await msg.reply('Unable to get a valid response.')
    return
  }

  if (!liveSubs.length) {
    await msg.reply('No subs are currently live.')
    return
  }

  if (msg.channel.type !== 'DM') {
    await msg.channel.send(
      `**${liveSubs.length}** of Anne's subscribers are currently live.\n` +
        `<https://annemunition.tv/armory>\n(DM me, the bot, for the full list.)`,
    )
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
      return `**${displayName(x.user)}**: __${x.game.name}__ - ${status}`
    })

  const split = Discord.Util.splitMessage(
    `**${strings.length}** of Anne's subscribers are currently live.\n` +
      `<https://annemunition.tv/armory>\n\n${strings.join('\n')}`,
  )

  for (const i in split) {
    await msg.author.send(split[i])
  }
}
