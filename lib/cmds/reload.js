'use strict';
exports.info = {
  name: 'reload',
  desc: 'Reloads/Loads a command into our command handler.',
  usage: 'reload <cmd>',
};

const fs = require('fs');
const path = require('path');
const logger = require('winston');

exports.run = (d, m, q = []) => {
  // Exit if no command was passed to load/reload
  if (q.length === 0) {
    return;
  }
  q.forEach(x => x.toLowerCase());
  const cmd = q[0];
  logger.debug(`Loading cmd '${cmd}'`);
  const cmdPath = path.join(process.cwd(), 'lib/cmds', `${cmd}.js`);
  logger.debug(cmdPath);

  // Determine if command file exists
  logger.debug('Checking if command file exists');
  fs.exists(cmdPath, exists => {
    if (exists) {
      logger.debug('Loading command', cmd);
      m.channel.sendMessage(`Loading command **${cmd}**`)
        .then(n => {
          loadCmd(d, cmdPath)
            .then(() => {
              n.edit(`Command **${cmd}** loaded successfully`);
            })
            .catch(err => {
              n.edit(`Error loading command **${cmd}**\n\`\`\`${err.stack}\`\`\``);
            });
        });
    }
  });
};

function loadCmd(d, cmdPath) {
  return new Promise((resolve, reject) => {
    let command;
    try {
      command = require(cmdPath);
      if (command.run && typeof command.run === 'function' && command.info) {
        d.cmds.delete(command.info.name);
        d.cmds.set(command.info.name, command);
        delete require.cache[require.resolve(cmdPath)];
        resolve(command);
      } else {
        reject(new Error('Missing \'run\' function in command file'));
      }
    } catch (err) {
      reject(err);
    }
  });
}
