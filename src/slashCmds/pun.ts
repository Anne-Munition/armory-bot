import axios from 'axios'
import cheerio from 'cheerio'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: 'pun',
  description: 'Post a random pun.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.deferReply()
  const { data: html } = await axios.get('https://pun.me/random/')
  const $ = cheerio.load(html)
  const number = $('.puns li span').text().trim()
  const pun = $('.puns li').text().replace(number, '').trim()
  if (!number || !pun) throw new Error('Unable to extract pun.')
  const becky2 = interaction.client.emojis.cache.get('458811307718868993')
  await interaction.editReply(`**${number}** - ${pun} ${becky2 || ''}`)
}
