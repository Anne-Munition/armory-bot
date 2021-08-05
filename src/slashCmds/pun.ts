import axios from 'axios'
import cheerio from 'cheerio'

export const info: SlashCmdInfo = {
  global: true,
}

export const commandData: SlashCommandData = {
  name: 'pun',
  description: 'Post a random pun.',
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.defer()
  const { data: html } = await axios.get('http://pun.me/random/')
  const $ = cheerio.load(html)
  const number = $('.puns li span').text()
  const pun = $('.puns li').text().replace(number, '')
  const becky2 = interaction.client.emojis.cache.get('458811307718868993')
  await interaction.editReply(`**${number}** - ${pun} ${becky2 || ''}`.trim())
}
