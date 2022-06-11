import { guildIds } from '../config'
import { getRandomDecimals, ignore } from '../utilities'

export const info: CmdInfo = {
  global: false,
  guilds: [guildIds.armory, guildIds.dev],
}

export const structure: CmdStructure = {
  name: 'bed',
  description: 'Chance going to bed.',
}

const randoms: number[] = []

function getDecimals() {
  getRandomDecimals(20)
    .then((numbers) => {
      randoms.push(...numbers)
    })
    .catch(ignore)
}

getDecimals()

export const run: CmdRun = async (interaction): Promise<void> => {
  const number = randoms.shift()
  if (randoms.length <= 5) getDecimals()
  let response = 'No'
  const odds = 1 / 10000
  if (number && number <= odds) response = 'You know what... Yes'

  await interaction.reply(response)
}
