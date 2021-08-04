import { CommandInteraction, GuildChannel, Snowflake, Util } from 'discord.js'
import TwitchChannel from '../database/services/twitch_channel_service'
import log from '../logger'
import getChannelColor from '../twitch/getChannelColor'
import { getUsers } from '../twitch/twitch_api'
import { makePossessive } from '../utilities'

export const info: SlashCmdInfo = {
  global: true,
}

export const commandData: SlashCommandData = {
  name: 'twitch',
  defaultPermission: true, // TODO
  description: 'Manage the channels posting Twitch stream updates.',
  options: [
    {
      name: 'add',
      type: 'SUB_COMMAND',
      description:
        "Add a Twitch stream's notifications to this Discord channel",
      options: [
        {
          name: 'channel',
          type: 'STRING',
          description: 'The Twitch channel to target.',
          required: true,
        },
      ],
    },
    {
      name: 'remove',
      type: 'SUB_COMMAND',
      description:
        "Remove a Twitch stream's notifications from this Discord channel",
      options: [
        {
          name: 'channel',
          type: 'STRING',
          description: 'The Twitch channel to target.',
          required: true,
        },
      ],
    },
    {
      name: 'list',
      type: 'SUB_COMMAND',
      description: 'List the Discord channels notifications are posted to.',
    },
  ],
}

export const run: SlashRun = async (interaction): Promise<void> => {
  if (!interaction.guild || !interaction.channel?.isText())
    return interaction.reply({
      content: 'This command must be ran in a guild text channel.',
      ephemeral: true,
    })
  await interaction.defer({ ephemeral: true })

  const discordData = {
    guild_id: interaction.guild.id,
    channel_id: interaction.channel.id,
  }

  const action = interaction.options.getSubcommand(true)
  log.debug(`twitch command action: ${action}`)
  switch (action) {
    case 'add':
      const addReply = await add(interaction, discordData)
      await interaction.editReply(addReply)
      break
    case 'remove':
      const removeReply = await remove(interaction, discordData)
      await interaction.editReply(removeReply)
      break
    case 'list':
      const listReply = await list(interaction, discordData)
      await interaction.editReply(listReply)
      break
    default:
      await interaction.editReply('Error processing this command.')
  }
}

async function add(
  interaction: CommandInteraction,
  discordData: { guild_id: Snowflake; channel_id: Snowflake },
): Promise<string> {
  const channel = interaction.options.getString('channel', true)

  // See if we have an existing doc for this twitch channel
  let doc
  try {
    doc = await TwitchChannel.get(channel)
  } catch (err) {
    return 'Database error. Please try again.'
  }

  log.debug(`twitch add - has existing doc: ${Boolean(doc)}`)
  if (doc) {
    // See if the channel this command was ran in is already registered
    const thisChannel = doc.discord_channels.find((x) => {
      return (
        x.guild_id === discordData.guild_id &&
        x.channel_id === discordData.channel_id
      )
    })

    log.debug(`twitch add - already had channel: ${Boolean(thisChannel)}`)
    if (thisChannel)
      return `This channel already gets notified when **${doc.display_name}** goes live on Twitch.`

    // Add this discord channel to the doc

    log.debug(`twitch add - adding channel: ${discordData.channel_id}`)
    doc.discord_channels.push(discordData)
    try {
      await TwitchChannel.save(doc)
    } catch (e) {
      return 'Database save error, please try again.'
    }

    return `This channel will now be notified when **${doc.display_name}** goes live on Twitch.`
  } else {
    // See if the channel passed is a valid twitch channel
    log.debug(`twitch add - checking for valid channel: ${channel}`)
    let users
    try {
      users = await getUsers([channel])
    } catch (e) {
      return 'Twitch API error. Please try again.'
    }
    const [user] = users
    if (!user) return `**${channel}** is not a known Twitch channel.`
    const color = await getChannelColor(user)

    // Add a new entry to the database with this discord channel
    log.debug(`twitch add - creating new db entry for: ${channel}`)
    try {
      await TwitchChannel.add(user, discordData, color)
    } catch (e) {
      return 'Database save error, please try again.'
    }

    return `This channel will now be notified when **${user.display_name}** goes live on Twitch.`
  }
}

async function remove(
  interaction: CommandInteraction,
  discordData: { guild_id: Snowflake; channel_id: Snowflake },
): Promise<string> {
  const channel = interaction.options.getString('channel', true)

  // See if we have an existing doc for this twitch channel
  let doc
  try {
    doc = await TwitchChannel.get(channel)
  } catch (err) {
    return 'Database error. Please try again.'
  }

  log.debug(`twitch remove - has existing doc: ${Boolean(doc)}`)
  if (doc) {
    // Get the index of the discord channel the command was ran in
    const index = doc.discord_channels.findIndex(
      (c) => c.channel_id === discordData.channel_id,
    )

    // Tell the user if this discord channel was not currently registered
    log.debug(`twitch remove - had channel: ${index === -1}`)
    if (index === -1)
      return `This channel is not currently notified when **${doc.display_name}** goes live on Twitch.`

    // Remove this discord channel from the registered channels
    doc.discord_channels.splice(index, 1)

    // See if there are still other channels remaining in this doc
    if (doc.discord_channels.length === 0) {
      try {
        log.debug(`twitch remove - removing entire doc`)
        await TwitchChannel.remove(doc)
      } catch (e) {
        return 'Database delete error. Please try again.'
      }
    } else {
      try {
        log.debug(
          `twitch remove - saving doc after removing discord channel entry`,
        )
        await TwitchChannel.save(doc)
      } catch (e) {
        return 'Database save error. Please try again.'
      }
    }

    return `This channel will no longer be notified when **${doc.display_name}** goes live on Twitch.`
  } else {
    // See if the doc could not be found because of a typo of the twitch channel
    log.debug(`twitch remove - checking for valid channel: ${channel}`)
    let users
    try {
      users = await getUsers([channel])
    } catch (e) {
      return 'Twitch API error. Please try again.'
    }

    const [user] = users
    if (!user) return `**${channel}** is not a known Twitch channel.`

    return `No channels are set to be notified when **${user.display_name}** goes live on Twitch.`
  }
}

async function list(
  interaction: CommandInteraction,
  discordData: { guild_id: Snowflake; channel_id: Snowflake },
): Promise<string> {
  let docs
  try {
    docs = await TwitchChannel.list()
  } catch (e) {
    return 'Database fetch error. Please try again.'
  }

  if (!docs.length)
    return 'No Twitch channels are currently posting when they go live.'

  const owner = interaction.user.id === process.env.OWNER_ID
  let str = ''

  if (owner) {
    docs.forEach((doc) => {
      const channels: {
        guildId: string
        guildName: string
        channels: GuildChannel[]
      }[] = []

      doc.discord_channels.forEach((docChannel) => {
        const guild = interaction.client.guilds.cache.get(docChannel.guild_id)
        if (!guild) return
        const channel = guild.channels.cache.get(docChannel.channel_id)
        if (channel && channel.type === 'GUILD_TEXT') {
          const ch = channels.find((x) => x.guildId === discordData.guild_id)
          if (ch) {
            ch.channels.push(channel)
          } else {
            channels.push({
              guildId: guild.id,
              guildName: guild.name,
              channels: [channel],
            })
          }
        }
      })

      str += getListHeader(doc.display_name)
      if (channels.length) {
        for (let i = 0; i < channels.length; i++) {
          str += `***${Util.escapeMarkdown(
            channels[i].guildName,
          )}***\n${channels[i].channels
            .map((x) => `#${Util.escapeMarkdown(x.name)}`)
            .join('\n')}`
          if (i < channels.length) str += '\n\n'
        }
      }
    })
  } else {
    const thisGuild = docs.filter((doc) =>
      doc.discord_channels.find((c) => c.guild_id === discordData.guild_id),
    )
    thisGuild.forEach((doc) => {
      const channels: GuildChannel[] = []
      doc.discord_channels.forEach((docChannel) => {
        const guild = interaction.client.guilds.cache.get(discordData.guild_id)
        const channel = guild?.channels.cache.get(docChannel.channel_id)
        if (channel && channel.type === 'GUILD_TEXT') channels.push(channel)
      })
      const channelsNames: string[] = channels
        .sort((a, b) => a.position - b.position)
        .map((x) => x.toString())
      str += getListHeader(doc.display_name)
      if (channelsNames.length) {
        str += channelsNames.join('\n')
      } else {
        str += 'Unable to get valid Discord Channels.'
      }
      str += '\n\n'
    })
  }

  return str
}

function getListHeader(name: string): string {
  return `**${makePossessive(name)}** Twitch streams post to:\n`
}
