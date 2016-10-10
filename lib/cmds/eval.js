'use strict';
exports.info = {
  name: 'eval',
  desc: 'Evaluate a js expression',
  usage: 'eval <expression>',
};

const util = require('util');
const logger = require('winston');

exports.run = (d, m, q = []) => {
  const discord = d.client;
  logger.debug(discord.user.username);
  if (m.author.id !== '84770528526602240') {
    logger.debug('Not allowed to run eval');
    return;
  }
  if (q.length === 0) {
    return;
  }
  const code = q.join(' ');
  try {
    let result = eval(code);
    if (typeof result !== 'string') {
      result = util.inspect(result);
    }
    m.channel.sendCode('javascript', clean(result));
  } catch (err) {
    m.channel.sendCode('javascript', clean(err));
  }
};

function clean(text) {
  if (typeof text === 'string') {
    return text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`);
  } else {
    return text;
  }
}
