'use strict';
exports.info = {
  desc: 'Responds with an fact from Snapple.',
  usage: '',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

const request = require('snekfetch');
const cheerio = require('cheerio');
const utils = require('../utilities');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
  let i = 0;

  function getFact() {
    i++;
    if (i > 10) return msg.channel.send(`Unable to find Fact 10 times. Exiting.`).then(resolve).catch(reject);
    const r = utils.getRandomInt(1, 1504);
    request.get(`https://www.snapple.com/real-facts/${r}`)
      .then(response => {
        const $ = cheerio.load(response.text);
        const fact = $('.fact-description div p').text();
        if (!fact) return getFact();
        // <:becky1:454917053069918209>
        const becky1 = client.emojis.get('454917053069918209');
        msg.channel.send(`Fact #${r} - ${fact} ${becky1 || ''}`).then(resolve).catch(reject);
      }).catch(reject);
  }

  getFact();
});
