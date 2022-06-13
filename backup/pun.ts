import puns from '../assets/puns.json'
import { getRandomInt } from '../src/utilities'

export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'pun',
  description: 'Post a random pun.',
}

export const run: CmdRun = async (interaction): Promise<void> => {
  const answer = puns[getRandomInt(0, puns.length)]
  const becky2 = interaction.client.emojis.cache.find((x) => x.name === 'becky2')
  await interaction.reply(`${answer} ${becky2 || ''}`)
}
