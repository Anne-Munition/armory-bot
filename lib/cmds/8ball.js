'use strict';
exports.info = {
  desc: 'Responds with a standard 8ball message when asked a question',
  usage: '8ball <question>',
  aliases: [],
};

const responses = require('../../assets/8ball.json');
const utils = require('../utilities');
const logger = require('winston');

exports.run = (client, msg, params = []) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    logger.debug('No parameters passed to 8ball');
    return;
  }
  // Get random response
  let res = responses[utils.getRandomInt(0, responses.length)];
  // If the last character is a '?' do troll response for DBKynd only
  if (msg.author.id === '84770528526602240' && params[params.length - 1].endsWith('?')) {
    res = 'Of course!';
  }
  // Reply with an @ mention
  msg.reply(res);
  utils.finish(client, msg, exports.info.name);
};
