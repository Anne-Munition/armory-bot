'use strict';
exports.info = {
  desc: 'D&D dice rolls. Shows critical successes/fails.',
  usage: '<>',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

const math = require('mathjs');
const Canvas = require('canvas');
const fs = require('fs');
const path = require('path');
const Image = Canvas.Image;

// Dice Roll
exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Set to 1d20 if no args passed
  if (params.length === 0) params[0] = 20;
  // Remove all spaces
  const query = params.join(' ').trim().replace(/\s/g, '');
  const embed = new client.Discord.RichEmbed()
    .setColor('RANDOM');
  // Only a number
  const numberOnly = new RegExp('^[1-9]\\d*$');
  if (numberOnly.test(query)) {
    embed.addField(`1d${query}`, `**${client.utils.getRandomIntInclusive(1, parseInt(query))}**`);
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

  if (dice.length < 2 && dice[0].text.split('d')[0] === '1') {
    embed.addField(query, `**${client.utils.getRandomIntInclusive(1, parseInt(dice[0].text.split('d')[1]))}**`);
    return msg.channel.send({ embed }).then(resolve).catch(reject);
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
      const r = client.utils.getRandomIntInclusive(1, parseInt(a[1]));
      if (!lowest || r < lowest) lowest = r;
      if (!highest || r > highest) highest = r;
      result += r;
      if (r === 1) {
        critFails++;
      } else if (r === parseInt(a[1])) {
        critSuccess++;
      }
      dieString += r;
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
  fs.readFile(path.join(__dirname, '../../assets/rolltable.png'), { encoding: null },
    (err, data) => {
      if (err) return reject(err);
      const img = new Image;
      const canvas = new Canvas(250, 70);
      const ctx = canvas.getContext('2d');
      img.src = data;
      ctx.font = '16px OpenSans';
      ctx.drawImage(img, 0, 0, 250, 70);
      ctx.fillText(query, 5, 20);
      ctx.font = '9px OpenSans';
      ctx.fillText(discordExploded.join(''), 5, 37);
      ctx.font = 'bold 16px OpenSans';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7f0b0f';
      ctx.fillText(critFails, 19, 57);
      ctx.fillStyle = '#0f7f0b';
      ctx.fillText(critSuccess, 54, 57);
      ctx.fillStyle = '#0b667f';
      ctx.fillText(lowest, 89, 57);
      ctx.fillText(highest, 124, 57);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000';
      ctx.font = '28px OpenSans';
      ctx.fillText(result, 215, 67);

      const files = [{
        attachment: canvas.toBuffer(),
      }];
      msg.channel.send({ files }).then(resolve).catch(reject);
    }
  );
});
