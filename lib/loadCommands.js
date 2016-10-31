'use strict';
const logger = require('winston');
const fs = require('fs');
const path = require('path');

module.exports = function LoadCommands(client) {
  client.commands.clear();
  client.aliases.clear();
  load(client)
    .then(() => {
      logger.info(`Loaded ${client.commands.size} command(s), with ${client.aliases.size} aliases.`);
    })
    .catch(err => {
      logger.error('Error loading commands', err);
    });
};

function load(client) {
  return new Promise((resolve, reject) => {
    logger.debug('Loading commands into memory');
    fs.readdir(path.join(process.cwd(), 'lib/cmds'), (err, files) => {
      if (err) {
        reject(err);
      } else {
        logger.info(`Loading ${files.length} command(s).`);
        files.forEach(f => {
          logger.debug(`Loading command: '${f}'`);
          const cmdPath = path.join(process.cwd(), 'lib/cmds', f);
          try {
            const cmd = require(cmdPath);
            client.commands.set(cmd.info.name, cmd);
          } catch (e) {
            logger.debug(`Error loading command file: '${f}'`, e);
          }
        });
        resolve();
      }
    });
  });
}
