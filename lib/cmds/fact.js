'use strict'
exports.info = {
  desc: 'Responds with an fact from Snapple.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

const axios = require('axios')
const cheerio = require('cheerio')
const utils = require('../utilities')

exports.run = (client, msg, params = []) =>
  new Promise(async (resolve, reject) => {
    const { data: html } = await axios.get('https://www.snapple.com/real-facts')
    const $ = cheerio.load(html)
    const fact = $('#facts .bottlecap .fact').text().replace(/\n/g, '')
    const number = $('#facts .bottlecap .number').text().replace(/\n/g, '')
    // <:becky1:454917053069918209>
    const becky1 = client.emojis.cache.get('454917053069918209')
    msg.channel
      .send(`Fact ${number} - ${fact} ${becky1 || ''}`.trim())
      .then(resolve)
      .catch(reject)
  })
