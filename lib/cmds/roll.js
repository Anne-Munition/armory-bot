'use strict';
exports.info = {
  desc: 'D&D dice rolls. Shows critical successes/fails.',
  usage: '',
  aliases: [],
};

const utils = require('../utilities');
const logger = require('winston');
const math = require('mathjs');

// Dice Roll
exports.run = (client, msg, params = []) => {
  // Exit if no parameters were passed
  if (!params[0]) {
    logger.debug('No parameters passes to roll');
    return;
  }
  // Remove all spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
  // Only a number
  let t = new RegExp('^[1-9]\\d*$');
  if (t.test(query)) {
    msg.reply(`**${utils.getRandomInt(1, parseInt(query) + 1)}**`);
    utils.finish(msg, exports.name);
    return;
  }
  // 4d20
  t = new RegExp('\\d*d[1-9]\\d*', 'gi');
  let myArray;
  const dice = [];

  while ((myArray = t.exec(query)) !== null) {
    dice.push({
      text: myArray[0].startsWith('d') ? `1${myArray[0]}` : myArray[0],
      pos: {
        start: t.lastIndex - myArray[0].length,
        end: t.lastIndex - 1,
      },
    });
  }

  logger.debug('query:', query);
  const mathExploded = query.split('');
  const discordExploded = query.split('');

  dice.forEach(die => {
    let dieString = '(';
    const a = die.text.split('d');
    let result = 0;
    for (let i = 0; i < a[0]; i++) {
      const r = utils.getRandomInt(1, parseInt(a[1]) + 1);
      result += r;
      if (r === 1 || r === parseInt(a[1])) {
        dieString += `**${r}**`;
      } else {
        dieString += r;
      }
      if (i < a[0] - 1) {
        dieString += '+';
      }
    }
    dieString += ')';
    for (let i = die.pos.start; i <= die.pos.end; i++) {
      delete mathExploded[i];
      delete discordExploded[i];
    }
    mathExploded[die.pos.start] = result;
    discordExploded[die.pos.start] = dieString;
  });

  logger.debug(mathExploded.join(''));
  logger.debug(discordExploded.join(''));
  let result;
  try {
    result = math.eval(mathExploded.join(''));
  } catch (e) {
    logger.warn('Error with math.eval()', params.join(' '), e);
    msg.channel.sendMessage(`\`\`Error\`\`\n\`\`\`${e.message}\`\`\``);
    utils.finish(msg, exports.name);
    return;
  }

  logger.debug('result', result);
  if (dice.length < 2 && dice[0].text.split('d')[0] === 1) {
    msg.reply(`**${result}**`);
  } else {
    msg.reply(`${discordExploded.join('')} = **${result}**`);
  }
  utils.finish(msg, exports.name);
};
