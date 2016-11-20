'use strict';
const moment = require('moment');
const request = require('request');
const logger = require('winston');
const now = require('performance-now');

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

  // Pad the right side of a string
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

  jsonRequest: (uri) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: encodeURI(uri),
        json: true,
      }, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          reject(err || res.statusCode);
        } else {
          resolve(body);
        }
      });
    });
  },

  bufferRequest: (uri) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: encodeURI(uri),
        encoding: null,
      }, (err, res, buffer) => {
        if (err || res.statusCode !== 200) {
          reject(err || res.statusCode);
        } else {
          resolve(buffer);
        }
      });
    });
  },

  utfRequest: (uri) => {
    return new Promise((resolve, reject) => {
      request.get({
        url: encodeURI(uri),
        encoding: 'utf8',
      }, (err, res, body) => {
        if (err || res.statusCode !== 200) {
          reject(err || res.statusCode);
        } else {
          resolve(body);
        }
      });
    });
  },

  removeCommand: (client, name, path) => {
    client.aliases.forEach((cmd, alias) => {
      if (cmd === name) {
        client.aliases.delete(alias);
      }
    });
    delete require.cache[require.resolve(path)];
    // Flush from command Collection
    client.commands.delete(name);
  },

  time: (msg, prop) => {
    const n = now();
    const diff = n - msg.time.start;
    if (prop in msg.time) {
      msg.time[prop] += diff;
      msg.time.start = n;
    }
  },

  finish: (msg, name) => {
    module.exports.time(msg, 'cpu');
    let str = `${name} finished in: ${(msg.time.cpu + msg.time.io).toFixed(3)}ms`;
    if (!msg.time.noIO) {
      str += ` - (CPU: ${msg.time.cpu.toFixed(3)}) (IO: ${msg.time.io.toFixed(3)})`;
    }
    logger.info(str);
  },

  formatDuration: (time) => {
    let str = '';
    const years = parseInt(time._data.years);
    if (years > 0) {
      str += `${years} year${years === 1 ? '' : 's'} `;
      time = time.subtract(moment.duration(years, 'years'));
    }
    const months = parseInt(time._data.months);
    if (months > 0) {
      str += `${months} month${months === 1 ? '' : 's'} `;
      time = time.subtract(moment.duration(months, 'months'));
    }
    const days = parseInt(time._data.days);
    if (days > 0) {
      str += `${days} day${days === 1 ? '' : 's'} `;
    }
    str += `${time._data.hours} hour${parseInt(time._data.hours) === 1 ? '' : 's'} `;
    str += `${time._data.minutes} minute${parseInt(time._data.minutes) === 1 ? '' : 's'} `;
    str += `${time._data.seconds} second${parseInt(time._data.seconds) === 1 ? '' : 's'} `;
    return str.trim();
  },

};
