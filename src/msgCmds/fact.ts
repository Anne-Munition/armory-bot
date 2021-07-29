import axios from 'axios'
import cheerio from 'cheerio'

export const info: CmdInfo = {
  desc: 'Responds with an fact from Snapple.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: false,
}

export const run: Run = async function (msg): Promise<void> {
  const { data: html } = await axios.get('https://www.snapple.com/real-facts')
  const $ = cheerio.load(html)
  const fact = $('#facts .bottlecap .fact').text().replace(/\n/g, '')
  const number = $('#facts .bottlecap .number').text().replace(/\n/g, '')
  const becky1 = msg.client.emojis.cache.get('454917053069918209')
  await msg.channel.send(`Fact ${number} - ${fact} ${becky1 || ''}`.trim())
}
