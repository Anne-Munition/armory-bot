import { guildConfigs } from '../collections'
import {
  defaultGuildConfig,
  update,
} from '../database/services/guild_config_service'
import log from '../logger'

export const info: CmdInfo = {
  desc: 'Set a custom prefix for commands in this guild.',
  usage: '<prefix>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
  dmAllowed: false,
  paramsRequired: true,
}

export const run: Run = async function (msg, params): Promise<void> {
  // Exit if not guild owner
  if (msg.author.id !== msg.guild?.ownerId) {
    await msg.reply('Only the guild owner can run this command.')
    return
  }

  if (!msg.guild || msg.channel.type !== 'GUILD_TEXT') {
    await msg.reply('This command must be ran in a guild text channel.')
    return
  }

  // Get any existing configs
  let conf = defaultGuildConfig
  const guildConf = guildConfigs.get(msg.guild.id)
  if (guildConf) conf = guildConf

  // Store new prefix in memory
  conf.prefix = params[0]
  guildConfigs.set(msg.guild.id, conf)

  try {
    await update(msg.guild.id, conf)
  } catch (err) {
    log.error(
      `There was an error saving setPrefix ${conf.prefix} for guild ${msg.guild.name}`,
    )
    log.error(err.stack || err.messge || err)
    await msg.reply('Database error, please try again.')
  }

  log.debug(`Saved setPrefix ${conf.prefix} for guild ${msg.guild.name}`)
  await msg.reply(
    `You have changed the prefix of all message commands on this server to: \`\`${conf.prefix}\`\``,
  )
}
