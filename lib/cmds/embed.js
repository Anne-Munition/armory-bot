'use strict';
exports.info = {
  desc: 'Shows list and descriptions of available commands. (this)',
  usage: '',
  aliases: [],
};

const fs = require('fs');
const utils = require('../utilities');
const moment = require('moment');

exports.run = (client, msg) => {
  const tweet = JSON.parse(fs.readFileSync('tweet2', { encoding: 'utf8' }));

  let text = tweet.text;
  if (tweet.extended_tweet && tweet.extended_tweet.extended_text) {
    text = tweet.extended_tweet.extended_text;
  }

  tweet.entities.user_mentions.forEach(u => {
    text = text.replace(`@${u.screen_name}`, `[@${u.screen_name}](https://twitter.com/${u.screen_name})`);
  });

  const embed = {
    color: Math.floor(Math.random() * 16777215),
    author: {
      name: `New Tweet from ${tweet.user.screen_name}:`,
    },
    url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
    description: text,
    thumbnail: {
      url: tweet.user.profile_image_url_https,
    },
    timestamp: moment(tweet.created_at),
  };

  //const links = tweet.entities.urls.map(u => u.expanded_url);

  msg.channel.sendMessage('', { embed }).catch(console.error);
};
