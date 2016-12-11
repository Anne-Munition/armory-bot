'use strict';
const logger = require('winston');
const moment = require('moment');
const config = require('../config');
const fs = require('fs');

module.exports = () => {
  const logDir = './logs';
  const logLevel = config.debug ? 'debug' : 'info';

  // Create log directory if it does not exist
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  // Log to console
  logger.remove(logger.transports.Console);
  logger.add(logger.transports.Console, {
    colorize: true,
    level: logLevel,
    timestamp: moment().utc().format(),
  });

  // Log to file
  logger.add(require('winston-daily-rotate-file'), {
    filename: `${logDir}/-results.log`,
    json: false,
    level: logLevel,
    prepend: true,
    timestamp: moment().utc().format(),
  });

  return logger;
};
