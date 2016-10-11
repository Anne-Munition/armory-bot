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
exports.run = (d, m, q = []) => {
  const avatarUri = m.author.avatarURL;
  if (!avatarUri) {
    m.reply('Cannot perform this operation without a custom avatar.');
    return;
  }
  q.forEach(x => x.toLowerCase());
  if (!q[0] || q[0] === 'help') {
    if (m.channel.type === 'text') {
      m.channel.sendMessage(':mailbox_with_mail:');
    }
    sendHatFormatMessage();
    return;
  }

  if (m.channel.type === 'text') {
    m.channel.sendMessage(':mailbox_with_mail:');
    sendHatFormatMessage();
  }

  const params = processParams(q);
  if (!params) {
    m.author.sendMessage(`Format error. Type \`\`${config.commands.prefix}hat\`\` to see usage options.`);
    return;
  }

  const hatFile = path.join(__dirname, '../../assets/hats/', `${q[0]}.png`);

  fs.exists(hatFile, (exists) => {
    if (!exists) {
      m.author.sendMessage(`'${q[0]}' is not a registered hat.`);
      return;
    }
    const hatData = {
      avatarUri,
      hatFile: hatFile,
      x: params.x,
      y: params.y,
      s: params.s,
      r: params.r,
    };
    m.author.sendMessage('Processing...');
    loadHat(hatData)
      .then(getHatSize)
      .then(downloadAvatar)
      .then(modifyHat)
      .then(getModifiedHatSize)
      .then(saveModifiedHat)
      .then(applyHatComposite)
      .then(data => {
        m.author.sendFile(data.avatarBufferEdited, `${m.author.id}_${q[0]}.png`)
          .then(() => {
            fs.unlink(data.tempHatPath);
          });
      })
      .catch((err) => {
        logger.error('Error processing hat:', err);
        m.author.sendMessage(`Error processing your '${q[0]}' hat. Please try again...`);
      });
  });

  function sendHatFormatMessage() {
    m.author.sendMessage(`\`\`\`Examples:\n${config.commands.prefix}hat <name> [Xoffset] [Yoffset] [scale] [rotation]` +
      `\n${config.commands.prefix}hat xmas 0 20 0.9 45\nHats: xmas\`\`\``);
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

    if (q[1]) {
      x = parseInt(q[1]);
    }
    if (q[2]) {
      y = -parseInt(q[2]);
    }
    if (q[3]) {
      // %
      if (q[3].indexOf('.') === -1) {
        s = parseInt(q[3]);
      } else {
        s = parseFloat(q[3]) * 100;
      }
    }
    if (q[4]) {
      r = parseInt(q[4]);
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
      const tempHatPath = path.join(__dirname, `../../temp/hat_${m.author.id}_${q[0]}.png`);
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
