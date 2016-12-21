'use strict';
exports.info = {
  desc: 'D&D dice rolls. Shows critical successes/fails.',
  usage: '<>',
  aliases: [],
};

const utils = require('../utilities');
const logger = require('winston');
const math = require('mathjs');

// Dice Roll
exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if no parameters were passed
  if (params.length === 0) {
    utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Remove all spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
  const embed = {
    color: utils.randomColorInt(),
    fields: [],
    thumbnail: {
      url: 'http://1.bp.blogspot.com/-fRzdpILdENU/TXXL0JQtIOI/AAAAAAAAADE/ngpY1z88iZ8/s1600/d20.jpg',
    },
  };
  // Only a number
  const numberOnly = new RegExp('^[1-9]\\d*$');
  if (numberOnly.test(query)) {
    embed.fields.push({ name: 'Result:', value: `**${utils.getRandomInt(1, parseInt(query) + 1)}**` });
    msg.channel.sendMessage('', { embed }).then(resolve).catch(reject);
    return;
  }
  // 4d20
  const diceText = new RegExp('\\d*d[1-9]\\d*', 'gi');
  let myArray;
  const dice = [];
  while ((myArray = diceText.exec(query)) !== null) {
    dice.push({
      text: myArray[0].startsWith('d') ? `1${myArray[0]}` : myArray[0],
      pos: {
        start: diceText.lastIndex - myArray[0].length,
        end: diceText.lastIndex - 1,
      },
    });
  }

  logger.debug('query:', query);
  const mathExploded = query.split('');
  const discordExploded = query.split('');

  let critFails = 0;
  let critSuccess = 0;
  let lowest = null;
  let highest = null;

  dice.forEach(die => {
    let dieString = '(';
    const a = die.text.split('d');
    let result = 0;
    for (let i = 0; i < a[0]; i++) {
      const r = utils.getRandomInt(1, parseInt(a[1]) + 1);
      if (!lowest || r < lowest) lowest = r;
      if (!highest || r > highest) highest = r;
      result += r;
      if (r === 1) {
        critFails++;
        dieString += `**${r}**`;
      } else if (r === parseInt(a[1])) {
        dieString += `**__${r}__**`;
        critSuccess++;
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
  } catch (err) {
    logger.warn('Error with math.eval()', params.join(' '), err);
    msg.channel.sendCode('js', err).then(resolve).catch(reject);
    return;
  }
  logger.debug('result', result);
  if (dice.length < 2 && dice[0].text.split('d')[0] === 1) {
    embed.fields.push({ name: 'Result:', value: result });
    msg.channel.sendMessage('', { embed }).then(resolve).catch(reject);
  } else {
    embed.title = `${query}`;
    embed.fields.push({ name: 'Dice:', value: discordExploded.join('') });
    embed.fields.push({ name: 'Critical Failures:', value: critFails, inline: true });
    embed.fields.push({ name: 'Critical Successes:', value: critSuccess, inline: true });
    embed.fields.push({ name: 'Lowest Roll:', value: lowest, inline: true });
    embed.fields.push({ name: 'Highest Roll:', value: highest, inline: true });
    embed.fields.push({ name: 'Total:', value: `**${result}**` });
    msg.channel.sendMessage('', { embed }).then(resolve).catch(reject);
  }
});
