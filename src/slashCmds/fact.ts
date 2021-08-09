import axios from 'axios'
import cheerio from 'cheerio'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'fact',
  description: 'Post a Snapple fact.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.deferReply()
  const { data: html } = await axios.get('https://snapple.com/real-facts')
  const $ = cheerio.load(html)
  const fact = $('#facts .bottlecap .fact').text().replace(/\n/g, '').trim()
  const number = $('#facts .bottlecap .number').text().replace(/\n/g, '').trim()
  if (!fact || !number) throw new Error('Unable to extract fact.')
  const becky1 = interaction.client.emojis.cache.get('454917053069918209')
  await interaction.editReply(`**Fact ${number}** - ${fact} ${becky1 || ''}`)
}
