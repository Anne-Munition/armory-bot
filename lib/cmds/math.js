'use strict';
exports.info = {
  desc: 'Solve a Math Equation.',
  usage: '<string>',
  aliases: [],
};

const utils = require('../utilities');
const math = require('mathjs');
const logger = require('winston');

exports.run = (client, msg, params = []) => new Promise(resolve => {
  // Exit if not params were passed
  if (params.length === 0) {
    utils.usage(msg, exports.info);
    return resolve();
  }
  // Format math string no spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
  logger.debug(query);
  let result;
  try {
    // Eval the math expression
    result = math.eval(query);
    // Post the math result
    msg.channel.sendCode('js', result);
  } catch (e) {
    logger.warn('Error with math.eval()', query, e);
    msg.reply(`\`\`Error\`\`\n\`\`\`${e.message}\`\`\``);
  }
  return resolve();
});

// TODO: embeds
