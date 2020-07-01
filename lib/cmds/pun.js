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
    const { data: html } = await axios.get(
      'http://www.punoftheday.com/cgi-bin/randompun.pl',
    )
    const $ = cheerio.load(html)
    const pun = $('#main-content div p').first().text()
    const becky2 = client.emojis.cache.get('458811307718868993')
    msg.channel
      .send(`${pun} ${becky2 || ''}`.trim())
      .then(resolve)
      .catch(reject)
  })
