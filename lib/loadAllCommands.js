'use strict';
const logger = require('winston');
const fs = require('fs');
const path = require('path');

module.exports = function LoadCommands(client) {
  return new Promise((resolve, reject) => {
    load(client)
      .then(resolve)
      .catch(reject);
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
        const promiseArray = files.map(f => {
          const cmdPath = path.join(process.cwd(), 'lib/cmds', f);
          return client.loadSingleCommand(client, cmdPath);
        });
        Promise.all(promiseArray)
          .then(resolve)
          .catch(reject);
      }
    });
  });
}
