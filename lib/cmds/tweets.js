'use strict';
exports.info = {
  desc: 'Manage posting Tweets to Discord channels.',
  usage: '<add | remove | list>',
  aliases: [],
};

const logger = require('winston');
const config = require('../../config');

// <add | remove | list> channels to post tweets to
exports.run = (client, msg, params = []) => {

};
