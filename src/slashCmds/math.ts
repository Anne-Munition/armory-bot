import util from 'util'
import Discord from 'discord.js'
import { evaluate, parse } from 'mathjs'
import log from '../logger'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'math',
  description: 'Evaluate an equation using math.js.',
  options: [
    {
      name: 'equation',
      type: 'STRING',
      description: 'Equation to evaluate.',
      required: true,
    },
  ],
}

export const run: SlashRun = async (interaction): Promise<void> => {
  const equation = interaction.options.getString('equation', true)
  log.debug(equation)

  const parsed = parse(equation)

  try {
    let result = evaluate(equation)
    if (typeof result !== 'string') result = util.inspect(result)
    await interaction.reply(`${parsed.toString()} = **${result}**`)
  } catch (err) {
    log.warn(
      `Error with math.evaluate(): '${parsed.toString()}' ${err.message}`,
    )
    const codeBlock = Discord.Formatters.codeBlock('js', err)
    await interaction.reply({
      content: `${parsed}\n${codeBlock}`,
      ephemeral: true,
    })
  }
}
