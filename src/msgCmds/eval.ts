import util from 'util'
import { MessageEmbed } from 'discord.js'
import now from 'performance-now'

export const info: CmdInfo = {
  desc: 'Evaluate a Javascript expression.',
  usage: '<expression>',
  aliases: [],
  hidden: true,
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}
// paramsRequired set to false even though we use params so we don't send a usage message

export const run: Run = async function (msg, params): Promise<void> {
  if (msg.author.id !== process.env.OWNER_ID) {
    await msg.reply('Only the bot owner has permissions to use ``eval``.')
    return
  }

  const query = params
    .join(' ')
    .trim()
    .replace(/\\n/g, '')
    // Emoji code fix
    .replace(/<:((\D*):(\d*))>/, `$1`)

  const embed = new MessageEmbed()
  let duration
  const start = now()

  try {
    let result = eval(query)
    // Loop through promises and return the last
    while (result && result.then) {
      result = await result
    }
    duration = getDuration(start)
    let resultStr
    if (typeof result !== 'string')
      resultStr = util.inspect(result, {
        showHidden: false,
        depth: 0,
      })
    resultStr = `\`\`\`js\n${resultStr}\`\`\``
    embed.addField('RESULT:', resultStr).setColor('#00ba25')
  } catch (err) {
    duration = getDuration(start)
    embed.addField('ERROR:', `\`\`\`js\n${err}\n\`\`\``).setColor('#bb3631')
  }
  embed.setFooter(duration, 'https://nodejs.org/static/images/logo-hexagon.png')

  await msg.channel.send({ embeds: [embed] })
}

function getDuration(start: number): string {
  const microseconds = (now() - start) * 1000
  if (microseconds < 1000) return Math.floor(microseconds * 1000) / 1000 + ' μs'
  else if (microseconds < 1000000)
    return Math.floor(microseconds) / 1000 + ' ms'
  return Math.floor(microseconds / 1000) / 1000 + ' s'
}
