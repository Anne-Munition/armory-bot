'use strict';
const logger = require('winston');
const fs = require('fs');
const path = require('path');
const now = require('performance-now');
const request = require('request');
const Vibrant = require('node-vibrant');

module.exports = {

  getRandomInt: (min, max) => Math.floor(Math.random() * (max - min)) + min,

  removeCommand: (client, cmdName) => {
    logger.debug(`Flushing command: '${cmdName}'`);
    client.aliases.forEach((cmd, alias) => {
      if (cmd.name === cmdName) client.aliases.delete(alias);
    });
    delete require.cache[require.resolve(path.join(client.commandsDir, `${cmdName}.js`))];
    client.commands.delete(cmdName);
  },

  finish: (msg, name) => logger.info(`${name} finished in: ${(now() - msg.startTime).toFixed(3)}ms`),

  requestJSON: (uri) => new Promise((resolve, reject) => {
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
  }),

  requestBuffer: (uri) => new Promise((resolve, reject) => {
    request.get({
      url: encodeURI(uri),
      encoding: null,
    }, (err, res, buffer) => {
      if (err || res.statusCode !== 200) {
        reject(err || res.statusCode);
      } else {
        resolve(buffer);
      }
    });
  }),

  loadOneCommand: (client, file) => new Promise((resolve, reject) => {
    const cmdPath = path.join(client.commandsDir, file);
    const name = path.parse(cmdPath).name;
    if (client.commands.has(name)) module.exports.removeCommand(client, name);
    logger.debug(`Loading command: '${name}'`);
    try {
      const command = require(cmdPath);
      command.name = name;
      client.commands.set(name, command);
      if (command.info.aliases) {
        command.info.aliases.forEach(alias => {
          if (client.commands.has(alias)) {
            logger.warn(`The command ${name} alias ${alias} already exists.`);
          } else {
            client.aliases.set(alias, command);
          }
        });
      }
      resolve();
    } catch (e) {
      reject(e);
    }
  }),

  loadAllCommands: (client) => new Promise((resolve, reject) => {
    logger.debug('Loading commands into memory');
    fs.readdir(client.commandsDir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        logger.info(`Loading ${files.length} command(s).`);
        const promiseArray = files.map(file => module.exports.loadOneCommand(client, file));
        client.commands.map(c => c.name)
          .filter(c => files.indexOf(`${c}.js`) === -1)
          .forEach(c => {
            logger.debug(`Command file '${c}' not found.`);
            module.exports.removeCommand(client, c);
          });
        Promise.all(promiseArray)
          .then(resolve)
          .catch(reject);
      }
    });
  }),

  palette: (image) => new Promise(async(resolve, reject) => {
    if (module.exports.isURI(image)) image = await module.exports.requestBuffer(image);
    Vibrant.from(image).getPalette((err, palette) => {
      if (err) {
        reject(err);
      } else {
        resolve(palette);
      }
    });
  }),

  isURI: (text) => text.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/), // eslint-disable-line

  rgbToInt: (r, g, b) => r << 16 | g << 8 | b, // eslint-disable-line

  randomColorInt: () => Math.floor(Math.random() * 16777215),

  displayName: (msg) => msg.member && msg.member.nickname ? msg.member.nickname : msg.author.username,

}
;
