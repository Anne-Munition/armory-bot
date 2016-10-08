'use strict';
const logger = require('winston');

module.exports = function Permissions() {
  logger.debug('Loading Permissions Module');

  // Checks mongoDB for permissions and returns true or false for allowed perms
  function check(id, cmd) {
    return new Promise((resolve, reject) => {
      if (id) {
        resolve(true);
      } else {
        reject();
      }
    });
  }

  function modify(message, query) {
    message.channel.sendMessage("WIP");
  }

  return {
    check,
    modify,
  };
};
