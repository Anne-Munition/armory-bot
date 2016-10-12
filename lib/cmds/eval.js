'use strict';
exports.info = {
  name: 'eval',
  desc: 'Evaluate a js expression',
  usage: 'eval <expression>',
};

const util = require('util');
const logger = require('winston');
const utils = require('../utilities');

exports.run = (discord, msg, params = []) => {
  // Only allowed for DBKynd regardless of other permissions
  if (msg.author.id !== '84770528526602240') {
    logger.debug('Not allowed to run eval');
    return;
  }
  // Exit if no expression was passed
  if (params.length === 0) {
    return;
  }
  // Join params into a string
  const code = params.join(' ');
  try {
    // Eval expression
    let result = eval(code);
    if (typeof result !== 'string') {
      // Inspect object to string if result is not a string
      result = util.inspect(result);
    }
    // Post Results
    msg.channel.sendCode('javascript', utils.clean(result));
  } catch (err) {
    // Post Error
    msg.channel.sendCode('javascript', utils.clean(err));
  }
};
