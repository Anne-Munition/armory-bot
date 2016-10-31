'use strict';
exports.info = {
  name: 'math',
  desc: 'Calculate a Math Equation from string input',
  usage: 'math <string>',
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
  } catch (e) {
    logger.warn('Error with math.eval()', params.join(' '), e);
    msg.reply(`\`\`Error\`\`\n\`\`\`${e.message}\`\`\``);
    return;
  }

  // Post the cleaned math result
  msg.channel.sendCode('js', utils.clean(result));
};
