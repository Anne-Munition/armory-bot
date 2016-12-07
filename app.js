'use strict';
const logger = require('./lib/logger')();
require('./lib');

process.on('unhandledRejection', err => {
  logger.error(`Uncaught Error: \n${err ? err.stack : ''}`);
});
