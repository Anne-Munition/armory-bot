'use strict';
exports.info = {
  desc: 'Responds with an 8ball message when asked a question.',
  usage: '<question>',
  aliases: [],
};

const responses = require('../../assets/8ball.json');
const utils = require('../utilities');
const config = require('../../config');

exports.run = (client, msg, params = []) => new Promise(resolve => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    utils.usage(msg, exports.info);
    return resolve();
  }
  // Get random response
  let response = responses[utils.getRandomInt(0, responses.length)];
  // If the last character is a '?' do troll response for bot owner
  if (msg.author.id === config.owner_id && params[params.length - 1].endsWith('?')) {
    response = 'Of course!';
  }
  // Reply with an @ mention
  msg.reply(response);
  return resolve();
});
