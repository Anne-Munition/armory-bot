'use strict';
const moment = require('moment');

module.exports = {
  // Return a random integer, non inclusive
  getRandomInt: (min, max) => Math.floor(Math.random() * (max - min)) + min,

  // Search and return a nested element in an object or null
  get: (obj, key) => key.split('.')
    .reduce((o, x) => typeof o === 'undefined' || o === null ? o : o[x], obj),

  // Capitalize a word
  capitalize: word => word.replace(/\b\w/g, l => l.toUpperCase()),

  // Returns UTC formatted timestamp
  getCurrentTime: () => moment().utc().format(),
};
