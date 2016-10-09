'use strict';
const moment = require('moment');

module.exports = {
  // Return a random integer, non inclusive
  getRandomInt: (min, max) => Math.floor(Math.random() * (max - min)) + min,

  // Search and return a nested element in an object or null
  get: (obj, key) => key.split('.')
    .reduce((o, x) => typeof o === 'undefined' || o === null ? o : o[x], obj),

  // Find key > value pair in array
  findInArray: (array, key, value) => {
    for (let i = 0; i < array.length; i++) {
      if (value === array[i][key]) {
        return i;
      }
    }
    return -1;
  },

  // Capitalize a word
  capitalize: (word) => word.replace(/\b\w/g, l => l.toUpperCase()),

  // Returns UTC formatted timestamp
  getCurrentTime: () => moment().utc().format(),

};
