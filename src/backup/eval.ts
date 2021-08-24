import util from 'util'
import { MessageEmbed, Snowflake } from 'discord.js'
import now from 'performance-now'

export const info: CmdInfo = {
  global: false,
  guilds: [
    '84764735832068096', // Armory
    '140025699867164673', // DBKynd
  ],
  defaultPermission: false,
  editablePermissions: false,
}

export const permissions: CmdPerms = [
  {
    id: <Snowflake>process.env.OWNER_ID,
    type: 'USER',
    permission: true,
  },
]

export const structure: CmdStructure = {
  name: 'eval',
  description: 'Evaluate a Javascript expression.',
  options: [
    {
      name: 'expression',
      type: 'STRING',
      description: 'Expression to evaluate.',
      required: true,
    },
  ],
}

export const run: CmdRun = async (interaction): Promise<void> => {
  if (interaction.user.id !== process.env.OWNER_ID) {
    await interaction.reply({
      content: 'Only the bot owner has permissions to /eval.',
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply()

  const expression = interaction.options.getString('expression', true)
  const query = expression
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
    embed.setFooter(
      duration,
      'https://nodejs.org/static/images/logo-hexagon.png',
    )
    await interaction.editReply({ content: expression, embeds: [embed] })
  } catch (err) {
    await interaction.deleteReply()
    duration = getDuration(start)
    embed.addField('ERROR:', `\`\`\`js\n${err}\n\`\`\``).setColor('#bb3631')
    embed.setFooter(
      duration,
      'https://nodejs.org/static/images/logo-hexagon.png',
    )
    await interaction.followUp({
      content: expression,
      embeds: [embed],
      ephemeral: true,
    })
  }
}

function getDuration(start: number): string {
  const microseconds = (now() - start) * 1000
  if (microseconds < 1000) return Math.floor(microseconds * 1000) / 1000 + ' μs'
  else if (microseconds < 1000000)
    return Math.floor(microseconds) / 1000 + ' ms'
  return Math.floor(microseconds / 1000) / 1000 + ' s'
}
