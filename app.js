'use strict';
const logger = require('./lib/logger')();
require('./lib');

process.on('unhandledRejection', err => {
  logger.error(`Uncaught Promise Error: \n${err ? err.stack : ''}`);
});
