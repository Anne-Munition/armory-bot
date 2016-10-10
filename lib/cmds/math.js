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
  try {
    const result = math.eval(q.join(' ').trim().replace(/\s/g, ''));
    if (result) {
      m.reply(result);
    } else {
      m.reply('Math Error');
    }
  } catch (e) {
    logger.warn('Error math-ing query', q.join(' '), e);
    m.reply(`Error: \`\`${e.message}\`\``);
  }
};
