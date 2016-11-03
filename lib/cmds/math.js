'use strict';
exports.info = {
  desc: 'Calculate a Math Equation from a string.',
  usage: '<string>',
  aliases: [],
};

const utils = require('../utilities');
const math = require('mathjs');
const logger = require('winston');

exports.run = (client, msg, params = []) => {
  // Exit if not params were passed
  if (params.length === 0) {
    logger.debug('No parameters passed to math');
    return;
  }
  // Format math string no spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
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
  utils.finish(client, msg, exports.name);
};
