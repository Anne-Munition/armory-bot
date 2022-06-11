import { ids } from '../config'
import { getRandomDecimals, ignore } from '../utilities'

export const info: CmdInfo = {
  global: false,
  guilds: [ids.armory.guild, ids.dev.guild],
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
  const isWinner = number && number <= odds
  if (isWinner) response = 'You know what... Yes!'
  await interaction.reply(response)
  const owner = await interaction.client.users.fetch(process.env.OWNER_ID)
  if (owner) {
    const user = interaction.user.toString()
    const guild = interaction.guild?.name
    const channel = interaction.channel?.toString()
    await owner.send(`Bed Winner! - ${user} - ${guild} - ${channel}`)
  }
}
