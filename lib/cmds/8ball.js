'use strict';
exports.info = {
  desc: 'Responds with an 8ball message when asked a question.',
  usage: '<question>',
  aliases: [],
};

const responses = require('../../assets/8ball.json');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if no 'question' was asked
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Get random response
  let response = responses[client.utils.getRandomInt(0, responses.length)];
  // If the last character is a '?' do troll response for bot owner
  if (msg.author.id === client.config.owner_id && params[params.length - 1].endsWith('?')) {
    response = 'Of course!';
  }
  // Reply with an @ mention
  msg.reply(response).then(resolve).catch(reject);
});
