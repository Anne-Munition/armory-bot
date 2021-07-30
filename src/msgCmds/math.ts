import util from 'util'
import Discord from 'discord.js'
import { evaluate } from 'mathjs'
import logger from '../logger'

export const info: CmdInfo = {
  desc: 'Solve a Math Equation.',
  usage: '<equation>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: true,
}

export const run: Run = async function (msg, params): Promise<void> {
  const query = params.join(' ').trim().replace(/\s/g, '')
  logger.debug(query)

  try {
    let result = evaluate(query)
    if (typeof result !== 'string') result = util.inspect(result)
    const codeBlock = Discord.Formatters.codeBlock('js', result)
    await msg.channel.send(codeBlock)
  } catch (err) {
    logger.warn(`Error with math.evaluate() ${query} ${err.message}`)
    const codeBlock = Discord.Formatters.codeBlock('js', err)
    await msg.channel.send(codeBlock)
  }
}
