import { Message, PartialMessage, Snowflake, TextChannel } from 'discord.js'
import { numberChannel, numberRole } from '../config'
import { NumberUserDoc } from '../database/models/number_user_model'
import CountService from '../database/services/count_service'
import NumberUserService from '../database/services/number_user_service'
import client from '../discord'
import { formatTimeDiff, ignore } from '../utilities'
import Count from './Count'

export const max = process.env.NODE_ENV === 'production' ? 1e5 : 100
const trigger = process.env.NODE_ENV === 'production' ? 1000 : 5
const lastUsers: Snowflake[] = []
const uniqueUsers = process.env.NODE_ENV === 'production' ? 3 : 1
const recentContent: { [key: number]: NodeJS.Timeout } = {}
const flairCount = process.env.NODE_ENV === 'production' ? 5 : 1
const numberReg = /^[1-9](\d+)?$/
const botDeletedMessages: string[] = []

export default async function (msg: Message): Promise<void> {
  // Only in number counting channel
  if (msg.channel.id !== numberChannel) return
  // Don't process bot messages
  if (msg.author.bot) return

  // Delete message if not a number
  // No leading 0s
  if (!numberReg.test(msg.content)) {
    deleteUserMistake(msg)
    return
  }
  const contentNum = parseInt(msg.content)

  // Delete message if user posted recently
  if (lastUsers.includes(msg.author.id)) {
    deleteUserMistake(msg)
    return
  }

  // Delete message if content entered recently
  if (recentContent[contentNum]) {
    deleteUserMistake(msg)
    return
  } else {
    recentContent[contentNum] = setTimeout(() => {
      delete recentContent[contentNum]
    }, 3000)
  }

  const nextNum = Count.get() + 1

  // Delete if not the next number
  if (contentNum !== nextNum) {
    deleteUserMistake(msg)
    return
  }

  // Delete if over the max number
  if (contentNum > max) {
    deleteMsg(msg)
    return
  }

  // Increment the count
  Count.inc()

  // Manipulate lastUsers array
  lastUsers.push(msg.author.id)
  if (lastUsers.length === uniqueUsers) lastUsers.shift()

  // Store the new number
  // Increment the user count
  try {
    await CountService.set('numberCount', nextNum)
    await NumberUserService.inc(msg.author.id, msg.author.username)
  } catch (e) {
    // Do Nothing
  }

  // Lock the channel once max count is reached
  if (nextNum === max) {
    await lockChannel(msg).catch(ignore)
  }

  // Post stats on trigger or max count
  if (nextNum % trigger === 0 || nextNum === max) {
    await postStats(msg).catch(ignore)
  }
}

export async function lock(): Promise<void> {
  try {
    const channel = client.channels.cache.get(numberChannel) as TextChannel
    await channel.permissionOverwrites.edit(channel.guild.id, {
      SEND_MESSAGES: false,
    })
  } catch (e) {
    // Do nothing if permissions throw
  }
}

export async function unlock(): Promise<void> {
  try {
    const channel = (await client.channels.fetch(numberChannel)) as TextChannel
    await channel.permissionOverwrites.edit(channel.guild.id, {
      SEND_MESSAGES: true,
    })
  } catch (e) {
    // Do nothing if permissions throw
  }
}

async function lockChannel(msg: Message): Promise<void> {
  // Deny @everyone SEND_MESSAGES permission
  await lock()

  await msg.channel
    .send({
      content:
        ':partying_face: :partying_face: CONGRATULATIONS, YOU DID IT! :partying_face: :partying_face:',
    })
    .catch(ignore)
}

async function postStats(msg: Message): Promise<void> {
  // Get the top 10 counters
  const top10 = await NumberUserService.top10()
  if (!top10.length) return

  // Update roles
  await updateRoles(msg, top10).catch(ignore)

  // Fetch the user or use the name from the database
  const results = []
  for (let i = 0; i < top10.length; i++) {
    const user = await msg.client.users
      .fetch(top10[i].discord_id)
      .catch(() => null)
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
  const createdAt = await CountService.time('numberCount').catch(ignore)
  let time
  if (createdAt) time = formatTimeDiff(createdAt.toISOString())

  // Create statistics string to post
  let str = `**Top 10 counters:**\n${mappedResults.join('\n')}`
  if (time) str += `\n${time}`

  await msg.channel
    .send({
      content: str,
      allowedMentions: { users: [] },
    })
    .catch(ignore)
}

async function updateRoles(
  msg: Message,
  top10: NumberUserDoc[],
): Promise<void> {
  const guild = msg.guild
  if (guild) {
    const role = await guild.roles.fetch(numberRole).catch(() => null)
    // Remove role from all existing members
    if (role) {
      // Map all the members currently with the role
      const membersWithRole = role.members.map((x) => x)

      // Get the members that should now have the role
      const membersToGetRole = []
      for (let i = 0; i < flairCount; i++) {
        const topCounter = await guild.members
          .fetch(top10[i].discord_id)
          .catch(() => null)
        if (topCounter) membersToGetRole.push(topCounter)
      }

      // Remove the role from members
      for (let i = 0; i < membersWithRole.length; i++) {
        const index = membersToGetRole.findIndex(
          (x) => x.id === membersWithRole[i].id,
        )
        // Remove role from members that are not in the next batch of top counters
        if (index === -1) {
          await membersWithRole[i].roles.remove(numberRole).catch(ignore)
        } else {
          // Remove the member from the list of members to add the role to since they already have it
          membersToGetRole.splice(index, 1)
        }
      }

      // Give role to remaining top counters
      for (let i = 0; i < membersToGetRole.length; i++) {
        await membersToGetRole[i].roles.add(role).catch(ignore)
      }
    }
  }
}

function deleteUserMistake(msg: Message): void {
  deleteMsg(msg)
  NumberUserService.incDeleted(msg.author.id, msg.author.username).catch(ignore)
}

function deleteMsg(msg: Message): void {
  if (msg.deletable) {
    msg.delete().catch(ignore)
    botDeletedMessages.push(msg.id)
    if (botDeletedMessages.length > 50) botDeletedMessages.shift()
  }
}

export async function numbersDeleted(
  msg: Message | PartialMessage,
): Promise<void> {
  if (botDeletedMessages.includes(msg.id)) return
  if (msg.content) {
    const count = Count.get().toString()
    if (count === msg.content) {
      await msg.channel.send(count)
    }
  }
}

export async function numbersEdited(
  prev: Message | PartialMessage,
): Promise<void> {
  if (prev.content) {
    const count = Count.get().toString()
    if (count === prev.content) {
      deleteMsg(prev as Message)
      prev.channel.send(count).catch(ignore)
    }
  }
}
