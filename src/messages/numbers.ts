import { Message } from 'discord.js'
import { numberChannel } from '../config'
import CountService from '../database/services/count_service'
import NumberUserService from '../database/services/number_user_service'
import { formatTimeDiff } from '../utilities'

const trigger = 5000
const max = 1e5

export default async function (msg: Message): Promise<void> {
  // Only in number counting channel
  if (msg.channel.id !== numberChannel) return
  // Delete if not a number
  if (!/\d+/.test(msg.content)) {
    await msg.delete()
    return
  }
  // Get current number from the database
  const currentNum = await CountService.get('numberCount')
  const nextNum = currentNum + 1
  // Delete if not the next number
  if (parseInt(msg.content) !== nextNum) {
    if (msg.deletable) await msg.delete()
    return
  }
  // Delete if over the max number
  if (parseInt(msg.content) > max) {
    if (msg.deletable) await msg.delete()
    return
  }
  // Store the new number
  await CountService.set('numberCount', nextNum)
  // Increment the user count
  await NumberUserService.inc(msg.author.id, msg.author.username)

  if (nextNum >= max) {
    // Lock the channel
    // Deny @everyone SEND_MESSAGES permission
    const guildId = msg.guild?.id
    if (guildId) {
      const guild = await msg.client.guilds.cache.get(guildId)
      const channel = await guild?.channels.fetch(msg.channel.id)
      try {
        channel?.permissionOverwrites.set([
          { id: guildId, deny: 'SEND_MESSAGES', type: 'role' },
        ])
      } catch (e) {
        // Do Nothing
      }

      await msg.channel.send({
        content:
          ':partying_face: :partying_face: CONGRATULATIONS, YOU DID IT! :partying_face: :partying_face:',
      })
    }
  }

  // On trigger
  if (nextNum % trigger === 0 || nextNum === max) {
    // Get the top 10 counters
    const top10 = await NumberUserService.top10()

    // Fetch the member or use the name from the database
    const results = []
    for (let i = 0; i < top10.length; i++) {
      const user = await msg.client.users.fetch(top10[i].discord_id)
      if (user) results.push({ name: user.toString(), count: top10[i].count })
      else
        results.push({
          name: `@${top10[i].discord_name}`,
          count: top10[i].count,
        })
    }
    // Format the response content
    const content = results
      .map((x) => {
        return `${x.name} - ${x.count}`
      })
      .join('\n')

    const createdAt = await CountService.time('numberCount')
    let time
    if (createdAt) time = formatTimeDiff(createdAt.toISOString())

    let str = `**Top 10 counters:**\n${content}`
    if (time) str += `\n${time}`

    await msg.channel.send({
      content: str,
      allowedMentions: { users: [] },
    })
  }
}
