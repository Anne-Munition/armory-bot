import util from 'util'
import Discord from 'discord.js'
import * as math from 'mathjs'
import log from '../logger'

export const info: CmdInfo = {
  global: true,
  defaultPermission: true,
  editablePermissions: true,
}

export const structure: CmdStructure = {
  name: 'math',
  description: 'Evaluate an expression using math.js.',
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
  const expression = interaction.options.getString('expression', true)
  log.debug(expression)

  const parsed = math.parse(expression)

  try {
    const result = math.evaluate(expression)
    // if (typeof result !== 'string') result = util.inspect(result)
    await interaction.reply(`${parsed} = **${result}**`)
  } catch (err) {
    log.warn(`Error with math.evaluate(): '${parsed}' ${err.message}`)
    const codeBlock = Discord.Formatters.codeBlock('js', err)
    await interaction.reply({
      content: `${parsed}\n${codeBlock}`,
      ephemeral: true,
    })
  }
}
