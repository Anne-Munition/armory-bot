import axios from 'axios'
import cheerio from 'cheerio'

export const info: CmdInfo = {
  desc: 'Responds with a random pun.',
  usage: '<question>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  const { data: html } = await axios.get('http://pun.me/random/')
  const $ = cheerio.load(html)
  const number = $('.puns li span').text()
  const pun = $('.puns li').text().replace(number, '')
  const becky2 = msg.client.emojis.cache.get('458811307718868993')
  await msg.channel.send(`**${number}** - ${pun} ${becky2 || ''}`.trim())
}
