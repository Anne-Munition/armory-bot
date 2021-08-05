import os from 'os'
import util from 'util'
import Discord from 'discord.js'
import getos from 'getos'
import moment from 'moment'
import pidusage from 'pidusage'
import counts from '../counts'
import { capitalize, formatDuration } from '../utilities'

export const info: SlashCmdInfo = {
  global: false,
  guilds: ['140025699867164673'],
}

export const commandData: SlashCommandData = {
  name: 'stats',
  defaultPermission: false,
  description: 'Display the client statistics.',
}

export const permissions: Discord.ApplicationCommandPermissionData[] = [
  {
    id: <Discord.Snowflake>process.env.OWNER_ID,
    type: 'USER',
    permission: true,
  },
]

const getOs = util.promisify(getos)

export const run: SlashRun = async (interaction): Promise<void> => {
  const client = interaction.client
  const thisOs = (await getOs()).os

  const nodeUp = moment.duration(process.uptime() * 1000)
  const totalMem = Math.floor(os.totalmem() / 1024 / 1024)
  const freeMem = Math.floor(os.freemem() / 1024 / 1024)
  const load = os.loadavg().map((x) => (x * 100).toFixed(3))
  const osUp = moment.duration(os.uptime() * 1000)
  const cpuData = os.cpus()
  const usedRam = Math.floor(totalMem - freeMem)

  const messageCount = counts.get('messagesSeen')
  const commandsCount = counts.get('msgCommandsRan')
  const twitchCount = counts.get('twitchLivePosts')

  let msgPm: number
  let cmdPm: number
  let twitchPm: number
  if (nodeUp.asHours() > 1) {
    msgPm = Math.floor(messageCount / nodeUp.asHours())
  } else {
    msgPm = messageCount
  }
  if (nodeUp.asDays() > 1) {
    cmdPm = Math.floor(commandsCount / nodeUp.asDays())
    twitchPm = Math.floor(twitchCount / nodeUp.asDays())
  } else {
    cmdPm = commandsCount
    twitchPm = twitchCount
  }

  const totalMembers = client.guilds.cache.reduce(
    (a, b) => a + b.members.cache.size,
    0,
  )
  const uniqueMembers = new Discord.Collection()
  client.guilds.cache.forEach((guild) => {
    guild.members.cache.forEach((member) => {
      if (!uniqueMembers.has(member.id)) {
        uniqueMembers.set(member.id, member)
      }
    })
  })

  const usage = await pidusage(process.pid)
  const cpu = usage.cpu.toFixed(3)

  let str = '--Bot Stats--\n'
  str += `Name: '${client.user?.tag}'` + `(ID: ${client.user?.id})\n`
  str += `Uptime: ${formatDuration(nodeUp)}\n`
  str += `RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB\n`
  str += `CPU: ${cpu}%\n`
  str += `Guilds: ${client.guilds.cache.size}\n`
  str += `Channels: ${
    client.channels.cache.filter((c) => c.type === 'GUILD_TEXT').size
  } text`
  str += ` / ${
    client.channels.cache.filter((c) => c.type === 'GUILD_VOICE').size
  } voice\n`
  str += `Members: ${uniqueMembers.size} unique / ${totalMembers} total\n`
  str += `Discord.js: '${Discord.version}'\n`

  str += '\n--System Stats--\n'
  str += `OS: '${capitalize(os.type().replace('_NT', ''))} - ${os.release()}`
  if (os.platform() === 'linux') {
    str += ` - ${capitalize(thisOs)}`
  }
  str += "'\n"
  str += `Core: '${cpuData[0].model}' (${cpuData.length}x)\n`
  str += `Uptime: ${formatDuration(osUp)}\n`
  str += `RAM: ${usedRam}MB/${totalMem}MB (${(
    (usedRam / totalMem) *
    100
  ).toFixed(2)}%)\n`
  str += `CPU: ${load[0]}%\n`

  str += '\n--Twitch Stats--\n'
  str += `Users: ${counts.get('twitchStreams')}\n`
  str += `Channels: ${counts.get('twitchChannels')}\n`

  str += '\n--Session Stats--\n'
  str += `Messages: ${messageCount} (${msgPm}/hr)\n`
  str += `Commands: ${commandsCount} (${cmdPm}/day)\n`
  str += `Twitch: ${twitchCount} (${twitchPm}/day)\n`

  const codeBlock = Discord.Formatters.codeBlock('qml', str)
  await interaction.reply({ content: codeBlock, ephemeral: true })
}
