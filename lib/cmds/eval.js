'use strict';
exports.info = {
  desc: 'Evaluate a js expression',
  usage: 'eval <expression>',
  aliases: [],
};

const util = require('util');
const logger = require('winston');
const utils = require('../utilities');
const now = require('performance-now');

exports.run = (client, msg, params = []) => {
  // Only allowed for the bot owner regardless of other permissions
  if (msg.author.id !== client.config.owner_id) {
    logger.debug(`${msg.author} is not allowed to eval`);
    return;
  }
  // Exit if no expression was passed
  if (params.length === 0) {
    logger.debug('No parameters passed to eval');
    return;
  }
  // Join params into a string
  const code = params.join(' ');
  try {
    // Eval expression
    const start = now();
    let result = eval(code);
    const d = (now() - start).toFixed(10);
    if (typeof result !== 'string') {
      // Inspect object to string if result is not a string
      result = util.inspect(result);
    }
    // Post Results
    msg.channel.sendMessage(`\`\`\`js\n${utils.clean(result)}\`\`\`\`\`${d}ms\`\``);
  } catch (err) {
    // Post Error
    msg.channel.sendMessage(`\`ERROR\` \`\`\`js\n${utils.clean(err)}\n\`\`\``);
  }
  utils.finish(client, msg, exports.info.name);
};
