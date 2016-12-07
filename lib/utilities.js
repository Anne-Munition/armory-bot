'use strict';
const logger = require('winston');
const path = require('path');
const now = require('performance-now');
const request = require('request');

module.exports = {

  getRandomInt: (min, max) => Math.floor(Math.random() * (max - min)) + min,

  removeCommand: (client, cmdName) => {
    logger.debug(`Flushing ${cmdName} command`);
    client.aliases.forEach((cmd, alias) => {
      if (cmd.name === cmdName) client.aliases.delete(alias);
    });
    delete require.cache[require.resolve(path.join(client.commandsDir, `${cmdName}.js`))];
    client.commands.delete(cmdName);
  },

  time: (msg, prop) => {
    const n = now();
    const diff = n - msg.time.start;
    if (prop in msg.time) {
      msg.time[prop] += diff;
      msg.time.start = n;
    }
  },

  finish: (msg, name) => {
    module.exports.time(msg, 'cpu');
    let str = `${name} finished in: ${(msg.time.cpu + msg.time.io).toFixed(3)}ms`;
    if (!msg.time.noIO) {
      str += ` - (CPU: ${msg.time.cpu.toFixed(3)}) (IO: ${msg.time.io.toFixed(3)})`;
    }
    logger.info(str);
  },

  jsonRequest: (uri) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: encodeURI(uri),
        json: true,
      }, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          reject(err || res.statusCode);
        } else {
          resolve(body);
        }
      });
    });
  },

};
