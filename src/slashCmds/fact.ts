import axios from 'axios'
import cheerio from 'cheerio'

export const info: SlashCmdInfo = {
  global: true,
}

export const commandData: SlashCommandData = {
  name: 'fact',
  description: 'Post a Snapple fact.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.defer()
  const { data: html } = await axios.get('https://www.snapple.com/real-facts')
  const $ = cheerio.load(html)
  const fact = $('#facts .bottlecap .fact').text().replace(/\n/g, '')
  const number = $('#facts .bottlecap .number').text().replace(/\n/g, '')
  const becky1 = interaction.client.emojis.cache.get('454917053069918209')
  await interaction.editReply(
    `**Fact ${number}** - ${fact} ${becky1 || ''}`.trim(),
  )
}
