'use strict';
const logger = require('winston');
const fs = require('fs');
const utils = require('./utilities');

module.exports = function LoadAllCommands(client) {
  return new Promise((resolve, reject) => {
    logger.debug('Loading commands into memory');
    fs.readdir(client.commandsDir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        logger.info(`Loading ${files.length} command(s).`);
        // Create promise array of promises to load the command files
        const promiseArray = files.map(file => client.loadOneCommand(client, file));
        // Flush any commands that no longer have a file present
        client.commands
          .map(c => c.name)
          .filter(c => files.indexOf(`${c}.js`) === -1)
          .forEach(c => {
            logger.debug(`Command file '${c}' not found.`);
            utils.removeCommand(client, c);
          });
        // After no longer existing commands are flushed, load all commands
        Promise.all(promiseArray)
          .then(resolve)
          .catch(reject);
      }
    });
  });
};
