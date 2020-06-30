'use strict'
exports.info = {
  desc: 'Responds with a random pun.',
  usage: '<question>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
}

const request = require('snekfetch')
const cheerio = require('cheerio')

exports.run = (client, msg, params = []) =>
  new Promise((resolve, reject) => {
    // eslint-disable-line no-unused-vars
    request
      .get('http://www.punoftheday.com/cgi-bin/randompun.pl')
      .then((response) => {
        const $ = cheerio.load(response.text)
        const pun = $('#main-content div p').first().text()
        const becky2 = client.emojis.cache.get('458811307718868993')
        msg.channel
          .send(`${pun} ${becky2 || ''}`.trim())
          .then(resolve)
          .catch(reject)
      })
      .catch(reject)
  })
