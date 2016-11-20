'use strict';
const logger = require('winston');

setTimeout(check, 1000 * 5);
setInterval(check, 1000 * 60 * 60);

function check() {
  logger.info(`Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
}
