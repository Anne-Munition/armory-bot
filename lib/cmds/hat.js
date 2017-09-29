'use strict';
exports.info = {
  desc: 'Composite an available hat onto your avatar image.',
  usage: '<hatName> [Xoffset] [Yoffset] [scale] [rotation]',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
};

const fs = require('fs');
const path = require('path');
const gm = require('gm');
const now = require('performance-now');

// Downloads users avatar and  composites a selectable hat over it then send it back as a PM
exports.run = (client, msg, params = []) => new Promise(async (resolve, reject) => {
  // Get the message authors avatar url
  const avatarUri = msg.author.avatarURL;
  // Exit if no avatar
  if (!avatarUri) {
    msg.reply('Cannot perform this operation without a custom avatar.').then(resolve).catch(reject);
    return;
  }
  // Lowercase all parameters
  params = params.map(x => x.toLowerCase());

  // If we are in a normal guild text channel, send mailbox emoji
  if (msg.channel.type === 'text') {
    msg.channel.send(':mailbox_with_mail:');
    sendHatFormatMessage(client, msg);
    if (params.length === 0 || params[0] === 'help') return;
  } else if (params.length === 0 || params[0] === 'help') {
    // Send usage examples if help or no parameters and example as DM
    // Send mailbox emoji if in guild text channel
    sendHatFormatMessage(client, msg).then(resolve).catch(reject);
    return;
  }

  // Parse passed parameters
  const translateParams = processParams(params);
  // Exit if there was an error parsing parameters
  if (!translateParams) {
    client.utils.getDmChannel(msg)
      .send(`Format error. Type \`\`${msg.prefix}hat\`\` to see usage options.`)
      .then(resolve)
      .catch(reject);
    return;
  }
  // Set the path for the hat we want
  const hatFile = path.join(client.assetsDir, 'hats', `${params[0]}.png`);
  fs.exists(hatFile, (exists) => {
    // Exit if the hat does not exist
    if (!exists) {
      client.utils.getDmChannel(msg)
        .send(`**${params[0]}** is not a registered hat.`)
        .then(resolve)
        .catch(reject);
      return;
    }
    const hatData = {
      client,
      hat: params[0],
      authorId: msg.author.id,
      avatarUri,
      hatFile: hatFile,
      x: translateParams.x,
      y: translateParams.y,
      s: translateParams.s,
      r: translateParams.r,
    };
    client.utils.getDmChannel(msg)
      .send('Processing...')
      .then(m => {
        processHat(hatData)
          .then(data => {
            postHat(client, data, m, msg, params[0]).then(resolve).catch(reject);
          })
          .catch(err => {
            client.logger.error(`Error processing '${params[0]}' hat`);
            msg.edit(`Error processing your '${params[0]}' hat. Please try again...`);
            reject(err);
          });
      })
      .catch(reject);
  });
});

function postHat(client, data, m, msg, name) {
  return new Promise((resolve, reject) => {
    m.edit(`Completed in ${(now() - msg.startTime).toFixed(0)}ms`);
    const files = [{
      attachment: data.avatarBufferEdited,
      name: `${msg.author.id}_${name}.png`,
    }];
    client.utils.getDmChannel(msg)
      .send({ files })
      .then(() => {
        fs.unlink(data.tempHatPath, err => {
          if (err) {
            data.client.logger.error('error un-linking file', data.tempHatPath, err);
          }
        });
      })
      .catch(reject);
  });
}

function processHat(hatData) {
  return new Promise((resolve, reject) => {
    loadHat(hatData)
      .then(getHatSize)
      .then(downloadAvatar)
      .then(resizeAvatar)
      .then(modifyHat)
      .then(getModifiedHatSize)
      .then(saveModifiedHat)
      .then(applyHatComposite)
      .then(resolve)
      .catch(reject);
  });
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
    hatData.client.utils.requestBuffer(hatData.avatarUri)
      .then(buffer => {
        hatData.avatarBuffer = buffer;
        resolve(hatData);
      })
      .catch(reject);
  });
}

function resizeAvatar(hatData) {
  return new Promise((resolve, reject) => {
    gm(hatData.avatarBuffer)
      .resizeExact(128, 128)
      .toBuffer('PNG', (err, avatarBufferEdited) => {
        if (err) {
          reject(err);
        } else {
          hatData.avatarBuffer = avatarBufferEdited;
          resolve(hatData);
        }
      });
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
    const tempHatPath = path.join(hatData.client.tempDir, `hat_${hatData.authorId}_${hatData.hat}.png`);
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


function processParams(params) {
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

function sendHatFormatMessage(client, msg) {
  return new Promise((resolve, reject) => {
    client.utils.getDmChannel(msg)
      .send(`\`\`\`Examples:\n${msg.prefix}hat <name> ` +
        `[Xoffset] [Yoffset] [scale] [rotation]\n${msg.prefix}hat xmas 0 20 0.9 45\n` +
        `Hats: xmas | hallo\`\`\``)
      .then(resolve)
      .catch(reject);
  });
}
