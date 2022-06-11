import axios from 'axios'
import cheerio from 'cheerio'

export const info: CmdInfo = {
  global: true,
}

export const structure: CmdStructure = {
  name: 'fact',
  description: 'Post a Snapple fact.',
}

export const run: CmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply()
  const { data: html } = await axios.get('https://snapple.com/real-facts')
  const $ = cheerio.load(html)
  const fact = $('#facts .bottlecap .fact').text().replace(/\n/g, '').trim()
  const number = $('#facts .bottlecap .number').text().replace(/\n/g, '').trim()
  if (!fact || !number) throw new Error('Unable to extract fact.')
  const becky1 = await interaction.client.emojis.cache.find((x) => x.name === 'becky1')
  await interaction.editReply(`**Fact ${number}** - ${fact} ${becky1 || ''}`)
}
