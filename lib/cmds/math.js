'use strict';
exports.info = {
  name: 'math',
  desc: 'Calculate a Math Equation from string input',
  usage: 'math <string>',
};

const math = require('mathjs');

exports.run = (d, m, q = []) => {
  if (q.length === 0) {
    return;
  }
  const result = math.eval(q.join(' ').trim().replace(/\s/g, ''));
  if (result) {
    m.reply(result);
  } else {
    m.reply('Error math-ing');
  }
};
