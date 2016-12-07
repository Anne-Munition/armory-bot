'use strict';
const logger = require('winston');
const fs = require('fs');
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

  loadOneCommand: (client, file) => {
    return new Promise((resolve, reject) => {
      // Get the file (cmd) name
      const cmdPath = path.join(client.commandsDir, file);
      const name = path.parse(cmdPath).name;
      // See if the command exists already in our collection
      if (client.commands.has(name)) {
        // Command exists already
        module.exports.removeCommand(client, name);
      }
      // Load the command
      logger.debug(`Loading command: '${name}'`);
      try {
        const command = require(cmdPath);
        // Set name from file name. Used in cmds command
        command.name = name;
        // Add command to Collection
        client.commands.set(name, command);
        // Add any command aliases to the alias Collection
        if (command.info.aliases) {
          command.info.aliases.forEach(alias => {
            // First come first serve in case of duplicates
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
    });
  },


  loadAllCommands: (client) => {
    return new Promise((resolve, reject) => {
      logger.debug('Loading commands into memory');
      fs.readdir(client.commandsDir, (err, files) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`Loading ${files.length} command(s).`);
          // Create promise array of promises to load the command files
          const promiseArray = files.map(file => module.exports.loadOneCommand(client, file));
          // Flush any commands that no longer have a file present
          client.commands
            .map(c => c.name)
            .filter(c => files.indexOf(`${c}.js`) === -1)
            .forEach(c => {
              logger.debug(`Command file '${c}' not found.`);
              module.exports.removeCommand(client, c);
            });
          // After no longer existing commands are flushed, load all commands
          Promise.all(promiseArray)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  },


};
