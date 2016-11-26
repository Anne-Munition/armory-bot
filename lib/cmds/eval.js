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

exports.run = (client, msg, params = []) => {
  // Only allowed for the bot owner regardless of other permissions
  if (msg.author.id !== config.owner_id) {
    logger.debug(`${msg.author} is not allowed to eval`);
    msg.reply('Only the bot owner has permissions to use ``eval``.');
    return;
  }
  // Exit if no expression was passed
  if (params.length === 0) {
    logger.debug('No parameters passed to eval');
    return;
  }
  const q = params.join(' ').replace(/\\n/g, '');
  let str = `**Input:**\n\`\`\`js\n${q}\`\`\``;
  try {
    // Eval expression
    const start = now();
    let result = eval(q);
    const d = (now() - start).toFixed(10);
    if (typeof result !== 'string') {
      // Inspect object to string if result is not a string
      result = util.inspect(result);
    }
    // Post Results
    str += `**Output:**\n\`\`\`js\n${result}\`\`\`\`\`${d}ms\`\``;
    msg.channel.sendMessage(str);
    msg.delete();
  } catch (err) {
    // Post Error
    str += `**Output:**\n\`\`ERROR\`\` \`\`\`js\n${err}\n\`\`\``;
    msg.channel.sendMessage(str);
    msg.delete();
  }
  utils.finish(msg, exports.name);
};
