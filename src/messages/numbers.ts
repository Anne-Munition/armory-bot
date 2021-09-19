import { Message, PartialMessage, Snowflake } from 'discord.js'
import { numberChannel, numberRole } from '../config'
import { NumberUserDoc } from '../database/models/number_user_model'
import CountService from '../database/services/count_service'
import NumberUserService from '../database/services/number_user_service'
import { formatTimeDiff } from '../utilities'

const max = 1e5
const trigger = process.env.NODE_ENV === 'production' ? 1000 : 5
const lastUsers: Snowflake[] = []
const uniqueUsers = process.env.NODE_ENV === 'production' ? 3 : 1
const recentContent: { [key: number]: NodeJS.Timeout } = {}
let lastDeleted: number
let currentNum: number
const flairCount = process.env.NODE_ENV === 'production' ? 3 : 1

// Get current number on startup
CountService.get('numberCount').then((num) => {
  currentNum = num
})

export default async function (msg: Message): Promise<void> {
  // Only in number counting channel
  if (msg.channel.id !== numberChannel) return

  // Delete message if not a number
  if (!/^[1-9]\d+$/.test(msg.content)) {
    await deleteUserMistake(msg)
    return
  }
  const contentNum = parseInt(msg.content)

  // Delete message if user posted recently
  if (lastUsers.includes(msg.author.id)) {
    lastDeleted = contentNum
    await deleteUserMistake(msg)
    return
  }

  // Delete message if content entered recently
  if (recentContent[contentNum]) {
    lastDeleted = contentNum
    await deleteUserMistake(msg)
    return
  } else {
    recentContent[contentNum] = setTimeout(() => {
      delete recentContent[contentNum]
    }, 3000)
  }

  if (currentNum === undefined) {
    await msg.channel
      .send({
        content: '<@84770528526602240>, error getting current count.',
        allowedMentions: { users: ['84770528526602240'] },
      })
      .catch(() => {
        // Do nothing if message fails
      })
    return
  }
  const nextNum = currentNum + 1

  // Delete if not the next number
  if (contentNum !== nextNum) {
    lastDeleted = contentNum
    await deleteUserMistake(msg)
    return
  }

  // Delete if over the max number
  if (contentNum > max) {
    lastDeleted = contentNum
    if (msg.deletable) await msg.delete()
    return
  }

  // Accept this as the new number
  currentNum = nextNum

  // Manipulate lastUsers array
  lastUsers.push(msg.author.id)
  if (lastUsers.length === uniqueUsers) lastUsers.shift()

  // Store the new number
  // Increment the user count
  try {
    await CountService.set('numberCount', nextNum)
    await NumberUserService.inc(msg.author.id, msg.author.username)
  } catch (e) {
    await msg.channel
      .send({
        content: '<@84770528526602240>, database warning.',
        allowedMentions: { users: ['84770528526602240'] },
      })
      .catch(() => {
        // Do nothing if message fails
      })
  }

  // Lock the channel once max count is reached
  if (nextNum === max) {
    try {
      await lockChannel(msg)
    } catch (e) {
      // Do nothing
    }
  }

  // Post stats on trigger or max count
  if (nextNum % trigger === 0 || nextNum === max) {
    try {
      await postStats(msg)
    } catch (e) {
      // Do nothing
    }
  }
}

async function lockChannel(msg: Message): Promise<void> {
  // Deny @everyone SEND_MESSAGES permission
  if (msg.guildId) {
    try {
      const guild = await msg.client.guilds.cache.get(msg.guildId)
      const channel = await guild?.channels.fetch(msg.channel.id)
      channel?.permissionOverwrites.set([
        { id: msg.guildId, deny: 'SEND_MESSAGES', type: 'role' },
      ])
    } catch (e) {
      // Do nothing if permissions throw
    }
  }

  await msg.channel.send({
    content:
      ':partying_face: :partying_face: CONGRATULATIONS, YOU DID IT! :partying_face: :partying_face:',
  })
}

async function postStats(msg: Message): Promise<void> {
  // Get the top 10 counters
  const top10 = await NumberUserService.top10()
  if (!top10.length) return

  // Update roles
  try {
    await updateRoles(msg, top10)
  } catch (e) {
    // Do nothing if updating roles throws
  }

  // Fetch the user or use the name from the database
  const results = []
  for (let i = 0; i < top10.length; i++) {
    const user = await msg.client.users.fetch(top10[i].discord_id)
    if (user)
      results.push({
        name: user.toString(),
        count: top10[i].count,
      })
    else
      results.push({
        name: `@${top10[i].discord_name}`,
        count: top10[i].count,
      })
  }
  // Format the response content
  const mappedResults = results.map((x) => {
    return `${x.count} - ${x.name}`
  })

  // Get time difference string since the first number was posted
  const createdAt = await CountService.time('numberCount')
  let time
  if (createdAt) time = formatTimeDiff(createdAt.toISOString())

  // Create statistics string to post
  let str = `**Top 10 counters:**\n${mappedResults.join('\n')}`
  if (time) str += `\n${time}`

  await msg.channel.send({
    content: str,
    allowedMentions: { users: [] },
  })
}

async function updateRoles(
  msg: Message,
  top10: NumberUserDoc[],
): Promise<void> {
  const guild = msg.guild
  if (guild) {
    const role = await guild.roles.fetch(numberRole)
    // Remove role from all existing members
    if (role) {
      const members = role.members.map((x) => x)
      for (let i = 0; i < members.length; i++) {
        await members[i].roles.remove(numberRole).catch(() => {
          // Do Nothing
        })
      }
    }
    // Give role to top counters
    for (let i = 0; i < flairCount; i++) {
      const topCounter = await guild.members.fetch(top10[i].discord_id)
      await topCounter.roles.add(numberRole).catch(() => {
        // Do Nothing
      })
    }
  }
}

async function deleteUserMistake(msg: Message) {
  if (msg.deletable) await msg.delete()
  try {
    await NumberUserService.incDeleted(msg.author.id, msg.author.username)
  } catch (e) {
    // Do Nothing
  }
}

export async function numbersDeleted(
  msg: Message | PartialMessage,
): Promise<void> {
  if (!currentNum) currentNum = await CountService.get('numberCount')
  if (msg.content) {
    const contentNum = parseInt(msg.content)
    // Send the correct current number if the current number was deleted
    if (currentNum === contentNum && currentNum !== lastDeleted) {
      await msg.channel.send(currentNum.toString())
    }
  }
}

export async function numbersEdited(
  prev: Message | PartialMessage,
): Promise<void> {
  if (prev.content) {
    if (!currentNum) currentNum = await CountService.get('numberCount')
    const contentNum = parseInt(prev.content)
    // Send the correct current number if the current number was edited
    if (currentNum === contentNum && currentNum !== lastDeleted) {
      // Delete edited message
      lastDeleted = contentNum
      if (prev.deletable) await prev.delete()
      await prev.channel.send(currentNum.toString())
    }
  }
}
