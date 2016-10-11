'use strict';
exports.info = {
  name: 'math',
  desc: 'Calculate a Math Equation from string input',
  usage: 'math <string>',
};

const math = require('mathjs');
const logger = require('winston');

exports.run = (d, m, q = []) => {
  if (q.length === 0) {
    return;
  }
  const query = q.join(' ').trim().replace(/\s/g, '');
  let result;
  try {
    result = math.eval(query);
  } catch (e) {
    logger.warn('Error with math.eval()', q.join(' '), e);
    m.reply(`Error: \`\`${e.message}\`\``);
    return;
  }

  if (result === null) {
    m.reply('Math Error');
  } else {
    m.channel.sendCode('javascript', result);
  }
};
