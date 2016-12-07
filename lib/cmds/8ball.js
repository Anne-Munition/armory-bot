'use strict';
exports.info = {
  desc: 'Responds with an 8ball message when asked a question.',
  usage: '<question>',
  aliases: [],
};

const responses = require('../../assets/8ball.json');
const utils = require('../utilities');
const logger = require('winston');
const config = require('../../config');

exports.run = function EightBall(client, msg, params = []) {
  return new Promise(resolve => {
    // Exit if no 'question' was asked
    if (params.length === 0) {
      logger.debug('No parameters passed to 8ball');
      msg.reply(`\`\`${msg.prefix}8ball <question>\`\``);
      resolve();
      return;
    }
    // Get random response
    let response = responses[utils.getRandomInt(0, responses.length)];
    // If the last character is a '?' do troll response for bot owner
    if (msg.author.id === config.owner_id && params[params.length - 1].endsWith('?')) {
      response = 'Of course!';
    }
    // Reply with an @ mention
    msg.reply(response);
    resolve();
  });
};
