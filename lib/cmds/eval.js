'use strict';
exports.info = {
  desc: 'Evaluate a Javascript expression.',
  usage: '<expression>',
  aliases: [],
};

const config = require('../../config');
const util = require('util');
const utils = require('../utilities');
const now = require('performance-now');
const Discord = require('discord.js');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Only allowed for the bot owner regardless of other permissions
  if (msg.author.id !== config.owner_id) {
    msg.reply('Only the bot owner has permissions to use ``eval``.').then(resolve).catch(reject);
    return;
  }
  // Exit if no expression was passed
  if (params.length === 0) {
    utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  const q = params.join(' ').trim().replace(/\\n/g, '');
  const inputStr = `\`\`\`js\n${q}\`\`\``;
  const embed = new Discord.RichEmbed()
    .addField('INPUT:', inputStr);
  let d;
  const start = now();
  try {
    const result = eval(q);
    d = (now() - start).toFixed(7);
    let resultStr;
    if (typeof result !== 'string') resultStr = util.inspect(result, { color: true, depth: 0 });
    resultStr = `\`\`\`js\n${resultStr}\`\`\``;
    embed.addField('RESULT:', resultStr)
      .addField('TYPE:', `\`\`\`js\n${typeof result}\`\`\``)
      .setColor(utils.colorGreen());
  } catch (err) {
    d = (now() - start).toFixed(7);
    embed.addField('ERROR:', `\`\`\`js\n${err}\n\`\`\``)
      .setColor(utils.colorRed());
  }
  embed.setFooter(`${d}ms`);
  msg.channel.sendEmbed(embed).then(resolve).catch(reject);
});
