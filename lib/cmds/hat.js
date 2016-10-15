'use strict';
exports.info = {
  name: 'hat',
  desc: 'Composite a hat onto your avatar image',
  usage: 'hat <name> [Xoffset] [Yoffset] [scale] [rotation]',
};

const config = require('../../config');
const fs = require('fs');
const path = require('path');
const gm = require('gm');
const fetch = require('node-fetch');
const logger = require('winston');

// Downloads users avatar and  composites a selectable hat over it then send it back as a PM
exports.run = (discord, msg, params = []) => {
  const avatarUri = msg.author.avatarURL;
  if (!avatarUri) {
    msg.reply('Cannot perform this operation without a custom avatar.');
    return;
  }
  params.forEach(x => x.toLowerCase());
  if (!params[0] || params[0] === 'help') {
    if (msg.channel.type === 'text') {
      msg.channel.sendMessage(':mailbox_with_mail:');
    }
    sendHatFormatMessage();
    return;
  }

  if (msg.channel.type === 'text') {
    msg.channel.sendMessage(':mailbox_with_mail:');
    sendHatFormatMessage();
  }

  const translateParams = processParams(params);
  if (!translateParams) {
    msg.author.sendMessage(`Format error. Type \`\`${config.commands.prefix}hat\`\` to see usage options.`);
    return;
  }

  const hatFile = path.join(__dirname, '../../assets/hats/', `${params[0]}.png`);

  fs.exists(hatFile, (exists) => {
    if (!exists) {
      msg.author.sendMessage(`'${params[0]}' is not a registered hat.`);
      return;
    }
    const hatData = {
      avatarUri,
      hatFile: hatFile,
      x: translateParams.x,
      y: translateParams.y,
      s: translateParams.s,
      r: translateParams.r,
    };
    msg.author.sendMessage('Processing...')
      .then(m => {
        loadHat(hatData)
          .then(getHatSize)
          .then(downloadAvatar)
          .then(modifyHat)
          .then(getModifiedHatSize)
          .then(saveModifiedHat)
          .then(applyHatComposite)
          .then(data => {
            m.edit(`Completed in ${m.createdTimestamp - msg.createdTimestamp}ms`);
            msg.author.sendFile(data.avatarBufferEdited, `${msg.author.id}_${params[0]}.png`)
              .then(() => {
                fs.unlink(data.tempHatPath);
              });
          })
          .catch((err) => {
            logger.error('Error processing hat:', err);
            m.edit(`Error processing your '${params[0]}' hat. Please try again...`);
          });
      });
  });

  function sendHatFormatMessage() {
    msg.author.sendMessage(`\`\`\`Examples:\n${config.commands.prefix}hat <name> ` +
      `[Xoffset] [Yoffset] [scale] [rotation]\n${config.commands.prefix}hat xmas 0 20 0.9 45\nHats: xmas hallo\`\`\``);
  }

  function processParams() {
    // Shift X
    let x = 0;
    // Shift Y
    let y = 0;
    // Scale
    let s = 0;
    // Rotation
    let r = 0;

    if (params[1]) {
      x = parseInt(params[1]);
    }
    if (params[2]) {
      y = -parseInt(params[2]);
    }
    if (params[3]) {
      // %
      if (params[3].indexOf('.') === -1) {
        s = parseInt(params[3]);
      } else {
        s = parseFloat(params[3]) * 100;
      }
    }
    if (params[4]) {
      r = parseInt(params[4]);
    }

    if (isNaN(x) || isNaN(y) || isNaN(s) || isNaN(r)) {
      return null;
    }

    return {
      x,
      y,
      s,
      r,
    };
  }

  function loadHat(hatData) {
    return new Promise((resolve, reject) => {
      fs.readFile(hatData.hatFile, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          hatData.hatBuffer = buffer;
          resolve(hatData);
        }
      });
    });
  }

  function getHatSize(hatData) {
    return new Promise((resolve, reject) => {
      gm(hatData.hatBuffer)
        .size((err, hatSize) => {
          if (err) {
            reject(err);
          } else {
            hatData.hatSize = hatSize;
            hatData.startX = (128 - hatSize.width) / 2;
            hatData.startY = (128 - hatSize.height) / 2;
            resolve(hatData);
          }
        });
    });
  }

  function downloadAvatar(hatData) {
    return new Promise((resolve, reject) => {
      fetch(encodeURI(hatData.avatarUri))
        .then(r => r.buffer())
        .then(buffer => {
          hatData.avatarBuffer = buffer;
          resolve(hatData);
        })
        .catch(reject);
    });
  }

  function modifyHat(hatData) {
    return new Promise((resolve, reject) => {
      gm(hatData.hatBuffer)
        .scale(`${hatData.s.toString()}%${hatData.s.toString()}%`)
        .rotate('#FFFF', hatData.r)
        .toBuffer('PNG', (err, hatBufferEdited) => {
          if (err) {
            reject(err);
          } else {
            hatData.hatBufferEdited = hatBufferEdited;
            resolve(hatData);
          }
        });
    });
  }

  function getModifiedHatSize(hatData) {
    return new Promise((resolve, reject) => {
      gm(hatData.hatBufferEdited)
        .size((err, hatModifiedSize) => {
          if (err) {
            reject(err);
          } else {
            const shiftX = (hatData.hatSize.width - hatModifiedSize.width) / 2;
            const shiftY = (hatData.hatSize.height - hatModifiedSize.height) / 2;
            hatData.endX = hatData.startX + shiftX + hatData.x;
            hatData.endY = hatData.startY + shiftY + hatData.y;
            resolve(hatData);
          }
        });
    });
  }

  function saveModifiedHat(hatData) {
    return new Promise((resolve, reject) => {
      const tempHatPath = path.join(__dirname, `../../temp/hat_${msg.author.id}_${params[0]}.png`);
      fs.writeFile(tempHatPath, hatData.hatBufferEdited, (err) => {
        if (err) {
          reject(err);
        } else {
          hatData.tempHatPath = tempHatPath;
          resolve(hatData);
        }
      });
    });
  }

  function applyHatComposite(hatData) {
    return new Promise((resolve, reject) => {
      const x = hatData.endX >= 0 ? `+${hatData.endX.toString()}` : hatData.endX.toString();
      const y = hatData.endY >= 0 ? `+${hatData.endY.toString()}` : hatData.endY.toString();
      gm(hatData.avatarBuffer)
        .composite(hatData.tempHatPath)
        .geometry(x + y)
        .toBuffer('PNG', (err, avatarBufferEdited) => {
          if (err) {
            reject(err);
          } else {
            hatData.avatarBufferEdited = avatarBufferEdited;
            resolve(hatData);
          }
        });
    });
  }
};
