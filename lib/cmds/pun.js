'use strict'
exports.info = {
  desc: 'Responds with a random pun.',
  usage: '<question>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

const axios = require('axios')
const cheerio = require('cheerio')

exports.run = (client, msg, params = []) =>
  new Promise(async (resolve, reject) => {
    // eslint-disable-line no-unused-vars
    const { data: html } = await axios.get('https://pun.me/random/')
    const $ = cheerio.load(html)
    const number = $('.puns li span').text()
    const pun = $('.puns li').text().replace(number, '')
    const becky2 = client.emojis.cache.get('458811307718868993')
    msg.channel
      .send(`**${number}** - ${pun} ${becky2 || ''}`.trim())
      .then(resolve)
      .catch(reject)
  })
