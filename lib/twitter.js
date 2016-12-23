'use strict';
const logger = require('./logger')();
const config = require('../config');
const Twitter = require('twitter');
const Entities = require('html-entities').AllHtmlEntities;
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const utils = require('./utilities');
const request = require('request');

logger.debug('Loading TwitterStream Module');
// Get new twitter client
const twitter = new Twitter({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token_key: config.twitter.access_token_key,
  access_token_secret: config.twitter.access_token_secret,
});

const entities = new Entities();
let timerReloadCheck = null;
let twitterStream;
const processedTweets = [];

module.exports = function TwitterStream(client) {
  async function start() {
    logger.info('Starting Twitter Client');
    let results;
    try {
      results = await client.mongo.twitterChannels.find({});
    } catch (err) {
      logger.error('Error getting twitter channels from mongodb', err);
      return;
    }
    if (results.length === 0) {
      // Exit if there are no records. No twitter accounts have been added
      return;
    }
    // Filter out only twitter ids where we have at least one resolvable channel to post to
    const ids = getResolvableIds(client, results);
    // Get the names of those filtered ids
    const names = results.filter(x => ids.indexOf(x.id) !== -1)
      .map(x => x.screen_name);
    logger.debug('Streaming Twitter accounts:', ids, names);
    client.twitter.count = { users: ids, channels: getResolvableChannelsCount(client, results, ids) };

    // Set timer to check if we need to reload the twitter stream
    if (timerReloadCheck) {
      clearInterval(timerReloadCheck);
    }
    timerReloadCheck = setInterval(() => {
      reloadCheck(client);
    }, 1000 * 60 * 10);

    // Connect to twitter stream
    twitter.stream('statuses/filter', { follow: ids.join(',') }, stream => {
      // Save to global object to reference destroy later
      twitterStream = stream;
      while (client.twitter.mentions.length > 0) {
        const m = client.twitter.mentions.shift();
        m.channel.sendMessage(`${m.user}, This channel will now receive tweets from **${m.screen_name}**`);
      }
      stream.on('error', e => {
        logger.error('Twitter stream error:', e);
        client.twitter.reload = true;
      });
      stream.on('end', () => {
        logger.warn('Twitter stream disconnected');
        client.twitter.reload = true;
      });

      stream.on('data', tweet => {
        // If tweet is a deletion, delete all the corresponding discord messages
        if (tweet.delete) {
          logger.debug('Tweet event was a tweet deletion');
          deleteTweet(client, tweet);
          return;
        }
        // Exit if tweet not from sny of the registered owner ids. 'RT'
        if (ids.indexOf(tweet.user.id_str) === -1) {
          logger.debug('Tweet owner id was not in ids list, was an @response, exiting');
          return;
        }
        // Exit if used reply button to reply. 'PM'
        // Exit if message is an @ to another user. 'PM'
        if (tweet.in_reply_to_status_id !== null || tweet.in_reply_to_user_id !== null) {
          logger.debug('reply button or message is an @ to another user, PM, exiting');
          return;
        }
        // This is a tweet we want to post to Discord
        processTweet(client, tweet);
      });
    });
  }

  function getUser(n) {
    return new Promise((resolve, reject) => {
      twitter.get('users/lookup', { screen_name: n }, (err, body, res) => {
        if (err || res.statusCode !== 200) {
          reject(err || res.statusCode);
        } else {
          resolve(body);
        }
      });
    });
  }

  function stop() {
    logger.debug('Twitter Stopping');
    if (twitterStream) {
      twitterStream.destroy();
    }
  }

  function reset() {
    logger.debug('Twitter Resetting');
    stop();
    start();
  }

  async function reloadCheck() {
    if (client.twitter.reload) {
      client.twitter.reload = false;
      reset();
      return;
    }
    let results;
    try {
      results = await client.mongo.twitterChannels.find({});
    } catch (err) {
      logger.error('Error getting twitter channels from mongodb, reloadCheck', err);
    }
    const newIds = getResolvableIds(client, results);
    if (newIds.length !== client.twitter.count.users.length) {
      reset();
      return;
    }
    for (let i = 0; i < newIds.length; i++) {
      if (newIds[i] !== client.twitter.count.users.ids[i]) {
        reset();
        break;
      }
    }
  }

  return {
    start,
    getUser,
    reset,
  };
};

let count = 0;
function processTweet(client, tweet) {
  // Very rarely we get a duplicate tweet, so we keep the last 20 ids in an array to check against
  if (processedTweets.indexOf(tweet.id_str) !== -1) return;
  processedTweets.push(tweet.id_str);
  while (processedTweets.length > 20) processedTweets.shift();
  logger.info('Twitter activity');
  client.count.tweets++;
  // Log short tweet text as reference
  const short = tweet.text.substring(0, tweet.text.length > 50 ? 50 : tweet.text.length);
  logger.debug(JSON.stringify(tweet));
  logger.info(`${short}...`);
  // Decode html entities in the twitter text string so they appear correctly (&amp)
  let text;
  if (tweet.extended_tweet && tweet.extended_tweet.full_text) {
    text = entities.decode(tweet.extended_tweet.full_text);
  } else {
    text = entities.decode(tweet.text);
  }
  // Get any urls from the tweet text. NOT img or video urls
  // tweet.entities.urls always exists - defaults to an empty array
  // if (tweet.entities.urls.length > 0) {}

  fs.writeFile(`tweet${count++}`, JSON.stringify(tweet, null, 2), { encoding: 'utf8' });
  // TODO: temporary
}

function deleteTweet(client, tweet) {
  client.mongo.tweetMessages.findOne({ tweet_id: tweet.delete.status.id_str })
    .then(result => {
      if (result && result.channels) {
        result.channels.forEach(c => {
          if (c.messages.length === 1) {
            const uri = `https://discordapp.com/api/channels/${c.channel}/messages/${c.messages[0]}`;
            logger.debug(uri);
            request({
              method: 'delete',
              headers: {
                Authorization: `Bot ${config.bot_token}`,
              },
              url: encodeURI(uri),
            }, (err, res, body) => {
              if (err || (res.statusCode !== 200 && res.statusCode !== 204)) {
                logger.error('Error deleting single message', err || res.statusCode);
              } else {
                logger.debug('Message deleted OK', body);
              }
            });
          } else {
            // Bulk Delete
            const uri = `https://discordapp.com/api/channels/${c.channel}/messages/bulk-delete`;
            logger.debug(uri);
            request({
              method: 'post',
              headers: {
                Authorization: `Bot ${config.bot_token}`,
                'content-type': 'application/json',
              },
              json: {
                messages: c.messages,
              },
              uri: encodeURI(uri),
            }, (err, res, body) => {
              if (err || (res.statusCode !== 200 && res.statusCode !== 204)) {
                logger.error('Error deleting bulk messages', err || res.statusCode);
              } else {
                logger.debug('Bulk message deleted OK', body);
              }
            });
          }
        });
      }
    })
    .catch(logger.error);
}


function getResolvableIds(client, results) {
  return results.filter(x => {
    const channels = x.channels
      .map(c => client.channels.has(c.channel_id))
      .filter(c => c);
    return channels.length > 0;
  })
    .map(r => r.id);
}

function getResolvableChannelsCount(client, results) {
  const ids = getResolvableIds(client, results);
  return results.filter(x => ids.indexOf(x.id) !== -1)
    .reduce((a, b) => {
      const num = b.channels.reduce((c, d) => {
        if (client.channels.has(d.channel_id)) {
          c++;
        }
        return c;
      }, 0);
      return a + num;
    }, 0);
}
