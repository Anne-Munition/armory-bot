'use strict';
exports.info = {
  desc: 'D&D dice rolls. Shows critical successes/fails.',
  usage: '<>',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

const math = require('mathjs');

// Dice Roll
exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if no parameters were passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Remove all spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
  const embed = new client.Discord.RichEmbed()
    .setColor('RANDOM');
  // Only a number
  const numberOnly = new RegExp('^[1-9]\\d*$');
  if (numberOnly.test(query)) {
    embed.addField(`1d${query}`, `**${client.utils.getRandomInt(1, parseInt(query) + 1)}**`);
    msg.channel.send({ embed }).then(resolve).catch(reject);
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

  client.logger.debug('query:', query);
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
      const r = client.utils.getRandomInt(1, parseInt(a[1]) + 1);
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

  client.logger.debug(mathExploded.join(''));
  client.logger.debug(discordExploded.join(''));
  let result;
  try {
    result = math.eval(mathExploded.join(''));
  } catch (err) {
    client.logger.warn('Error with math.eval()', params.join(' '), err);
    msg.channel.send(err, { code: 'js' }).then(resolve).catch(reject);
    return;
  }
  client.logger.debug('result', result);
  if (dice.length < 2 && dice[0].text.split('d')[0] === 1) {
    embed.addField('Result:', result);
    msg.channel.send({ embed }).then(resolve).catch(reject);
  } else {
    embed.setTitle(`${query}`);
    if (discordExploded.join('').length < 250) {
      embed.addField('Dice:', discordExploded.join(''));
    }
    embed.addField('Critical Failures:', critFails, false)
      .addField('Critical Successes:', critSuccess, true)
      .addField('Lowest Roll:', lowest, false)
      .addField('Highest Roll:', highest, true)
      .addField('Total:', `**${result}**`);
    msg.channel.send({ embed }).then(resolve).catch(reject);
  }
});
