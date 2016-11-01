'use strict';
const moment = require('moment');
const request = require('request');
const logger = require('winston');

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

  // Clean a Discord message of mentions
  clean: text => {
    if (typeof text === 'string') {
      return text.replace(/`/g, `\`${String.fromCharCode(8203)}`).replace(/@/g, `@${String.fromCharCode(8203)}`);
    } else {
      return text;
    }
  },

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

  finish: (client, msg, name) => {
    logger.debug(`${name} finished in: ${client.now() - msg.start}ms`);
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
};
