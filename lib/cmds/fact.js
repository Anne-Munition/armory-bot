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
  const r = utils.getRandomInt(1, 1504);
  request.get(`https://www.snapple.com/real-facts/${r}`)
    .then(response => {
      const $ = cheerio.load(response.text);
      const fact = $('.fact-description div p').text();
      console.log(fact);
      msg.channel.send(`Fact# ${r} - ${fact}`).then(resolve).catch(reject);
    }).catch(reject);
});
