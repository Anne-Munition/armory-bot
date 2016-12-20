'use strict';
exports.info = {
  desc: 'Solve a Math Equation.',
  usage: '<string>',
  aliases: [],
};

const utils = require('../utilities');
const math = require('mathjs');
const logger = require('winston');
const util = require('util');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if not params were passed
  if (params.length === 0) {
    utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Format math string no spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
  logger.debug(query);
  try {
    // Eval the math expression
    let result = math.eval(query);
    if (typeof result !== 'string') result = util.inspect(result);
    msg.channel.sendCode('js', result).then(resolve).catch(reject);
  } catch (err) {
    logger.warn('Error with math.eval()', query, err);
    msg.channel.sendCode('js', err).then(resolve).catch(reject);
  }
});
