'use strict';
exports.info = {
  name: 'math',
  desc: 'Calculate a Math Equation from string input',
  usage: 'math <string>',
};

const utils = require('../utilities');
const math = require('mathjs');
const logger = require('winston');

exports.run = (discord, msg, params = []) => {
  // Exit if not params were passed
  if (params.length === 0) {
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
    msg.reply(`Error evaluating the expression:\n\`\`\`${e.message}\`\`\``);
    return;
  }

  // Result could be 0
  if (result === null) {
    msg.reply('Math Error');
  } else {
    msg.channel.sendCode('javascript', utils.clean(result));
  }
};
