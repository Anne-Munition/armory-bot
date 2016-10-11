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

  clean: text => {
    if (typeof text === 'string') {
      return text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`);
    } else {
      return text;
    }
  },

  pad: (str, p) => {
    if (p < str.length) {
      return str;
    }
    const a = str.split('');
    for (let i = str.length; i <= p; i++) {
      a[i] = ' ';
    }
    return a.join('');
  },

};
