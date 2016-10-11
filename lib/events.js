'use strict';
const EventEmitter = require('events');
const emitter = new EventEmitter();
const logger = require('winston');

emitter.on('error', err => {
  logger.error('there was an error with the myEvents emitter', err);
});

module.exports = emitter;
