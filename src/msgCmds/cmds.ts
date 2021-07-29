import Discord from 'discord.js'
import { commands } from '../collections'

export const info: CmdInfo = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  const ownerIds = msg.client.guilds.cache.map((guild) => guild.ownerId)
  ownerIds.push(<Discord.Snowflake>process.env.OWNER_ID)
  const seeHidden = ownerIds.includes(msg.author.id)
  const cmds = commands
    .filter((command) => !(command.info.hidden && !seeHidden))
    .map((command) => `${command.name}: ${command.info.desc}`)

  const codeBlock = Discord.Formatters.codeBlock(
    'apache',
    cmds.sort().join('\n'),
  )

  await msg.author
    .send(codeBlock)
    .then(() => {
      if (msg.channel.type === 'GUILD_TEXT') {
        msg.reply('I just sent you a DM with a list of commands.')
      }
    })
    .catch(() =>
      msg.reply(
        'Unable to send you a list of commands, Did you block me or DMs in general?',
      ),
    )
}
