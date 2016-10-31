'use strict';
const path = require('path');
const logger = require('winston');

module.exports = function LoadSingleCommand(client, cmdPath) {
  return new Promise((resolve, reject) => {
    const name = path.parse(cmdPath).name;
    if (client.commands.has(name)) {
      logger.debug(`Flushing ${name} command`);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === name) {
          client.aliases.delete(alias);
        }
      });
      client.commands.delete(name);
      delete require.cache[require.resolve(cmdPath)];
    }
    logger.debug(`Loading command: '${name}'`);
    try {
      const cmd = require(cmdPath);
      client.commands.set(name, cmd);
      if (cmd.info.aliases) {
        cmd.info.aliases.forEach(a => {
          client.aliases.set(a, cmd);
        });
      }
      resolve();
    } catch (e) {
      reject(e);
    }
  });
};
