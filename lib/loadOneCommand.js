'use strict';
const path = require('path');
const logger = require('winston');
const utils = require('./utilities');

module.exports = function LoadOneCommand(client, file) {
  return new Promise((resolve, reject) => {
    // Get the file (cmd) name
    const cmdPath = path.join(client.commandsDir, file);
    const name = path.parse(cmdPath).name;
    // See if the command exists already in our collection
    if (client.commands.has(name)) {
      // Command exists already
      utils.removeCommand(client, name);
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
};
