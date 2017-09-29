'use strict';
exports.info = {
  desc: 'Solve a Math Equation.',
  usage: '<string>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

const math = require('mathjs');
const util = require('util');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if not params were passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Format math string no spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
  client.logger.debug(query);
  try {
    // Eval the math expression
    let result = math.eval(query);
    if (typeof result !== 'string') result = util.inspect(result);
    msg.channel.send(result, { code: 'js' }).then(resolve).catch(reject);
  } catch (err) {
    client.logger.warn('Error with math.eval()', query, err);
    msg.channel.send(err, { code: 'js' }).then(resolve).catch(reject);
  }
});
