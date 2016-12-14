'use strict';
exports.info = {
  desc: 'Evaluate a Javascript expression.',
  usage: '<expression>',
  aliases: [],
};

const config = require('../../config');
const util = require('util');
const logger = require('winston');
const utils = require('../utilities');
const now = require('performance-now');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Only allowed for the bot owner regardless of other permissions
  if (msg.author.id !== config.owner_id) {
    logger.debug(`${msg.author} is not allowed to eval`);
    msg.reply('Only the bot owner has permissions to use ``eval``.');
    return reject('Not authorized');
  }
  // Exit if no expression was passed
  if (params.length === 0) {
    logger.debug('No parameters passed to eval');
    utils.usage(msg, exports.info);
    return resolve();
  }
  const q = params.join(' ').trim().replace(/\\n/g, '');
  const inputStr = `\`\`\`js\n${q}\`\`\``;
  const embed = {
    fields: [
      {
        name: 'INPUT:',
        value: inputStr,
      },
    ],
  };
  let d;
  const start = now();
  try {
    // Eval expression
    let result = eval(q);
    d = (now() - start).toFixed(10);
    if (typeof result !== 'string') {
      // Inspect object to string if result is not a string
      result = util.inspect(result);
    }
    // Post Results
    const resultStr = `\`\`\`js\n${result}\`\`\``;
    embed.fields.push({
      name: 'Result',
      value: resultStr,
    });
    embed.color = utils.hexToInt('00FF00');
  } catch (err) {
    d = (now() - start).toFixed(10);
    // Post Error
    const errorStr = `\`\`\`js\n${err}\n\`\`\``;
    embed.fields.push({
      name: 'Error',
      value: errorStr,
    });
    embed.color = utils.hexToInt('FF0000');
  }
  embed.fields.push({
    name: 'Time',
    value: `${d}ms`,
  });
  msg.channel.sendMessage('', { embed });
  return resolve();
});
