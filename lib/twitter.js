'use strict';
const logger = require('winston');
const config = require('../config');
const TwitterAPI = require('twitter');
const TwitterStream = require('twitter-stream-api');
const Entities = require('html-entities').AllHtmlEntities;
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const request = require('snekfetch');
const debug = require('debug')('twitterClient');

debug('Loading TwitterStream Module');

const twitterApi = new TwitterAPI({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token_key: config.twitter.access_token_key,
  access_token_secret: config.twitter.access_token_secret,
});

const twitterStream = new TwitterStream({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  token: config.twitter.access_token_key,
  token_secret: config.twitter.access_token_secret,
});

const entities = new Entities();
const processedTweets = [];
let timerReloadCheck = null;
const requiredPerms = ['SEND_MESSAGES', 'ATTACH_FILES'];
let timerKeepAlive;

module.exports = function TwitterClient(client) {
  async function start() {
    // Don't allow duplicate clients to run
    if (client.twitter.started) {
      debug('The Twitter client was started despite already having been started');
      return;
    }
    // Save that the twitter client is running
    client.twitter.started = true;
    logger.info('Starting Twitter Client');
    // Get all the twitter channels we want to follow
    const twitterChannels = await client.mongo.twitterChannels.find({});
    // Exit if we cannot get records, or there are no records.
    if (!twitterChannels || twitterChannels.length === 0) {
      debug('No twitter accounts have been added');
      return;
    }
    // Filter out only twitter ids where we have at least one resolvable channel to post to in Discord
    const ids = getTwitterUserIds(client, twitterChannels);
    // Twitter channels are registered, but no Discord channels are found with perms that let us post
    if (!ids || ids.length === 0) {
      debug('No Discord channels found with perms');
      return;
    }
    debug('Streaming Twitter accounts:', ids);
    // Store twitter ids
    client.twitter.ids = ids;
    // Store Number of resolvable channels
    client.twitter.channels = getResolvableChannelsCount(client, twitterChannels, ids);
    // Check every 10 minutes if we should reload the twitter client.
    // Flagged from error or adding/removing users via cmd
    if (timerReloadCheck) clearInterval(timerReloadCheck);
    timerReloadCheck = setInterval(reloadCheck, 1000 * 60 * 10);
    // Connect to twitter stream
    twitterStream.stream('statuses/filter', {
      follow: ids.join(','),
      stall_warnings: true,
    });

    // Emitted when a successful connection to the Twitter Stream API are established.
    twitterStream.on('connection success', uri => {
      logger.info('TwitterClient connection success', uri);
      // Message all users who subscribed to be notified that their twitter channel will be posted now
      while (client.twitter.mentions.length > 0) {
        const m = client.twitter.mentions.shift();
        m.channel.send(`${m.user}, This channel will now receive tweets from **${m.screen_name}**`);
      }
    });

    // Emitted when a the connection to the Twitter Stream API are taken down / closed.
    twitterStream.on('connection aborted', () => {
      logger.warn('TwitterClient connection aborted');
      if (client.twitter.started) reset();
    });

    // Emitted when the connection to the Twitter Stream API have TCP/IP level network errors.
    // This error event are normally emitted if there are network level errors during the connection process.
    // When this event is emitted a linear reconnect will start.
    // The reconnect will attempt a reconnect after 250 milliseconds
    // and increase the reconnect attempts linearly up to 16 seconds.
    twitterStream.on('connection error network', error => {
      logger.warn('TwitterClient connection error network', error);
    });

    // Emitted when the connection to the Twitter Stream API have been flagged as stall.
    // A stall connection is a connection which have not received any new data
    // or keep alive messages from the Twitter Stream API during a period of 90 seconds.
    // This error event are normally emitted when a connection have been established
    // but there has been a drop in it after a while.
    // When this event is emitted a linear reconnect will start.
    // The reconnect will attempt a reconnect after 250 milliseconds
    // and increase the reconnect attempts linearly up to 16 seconds.
    twitterStream.on('connection error stall', () => {
      logger.warn('TwitterClient connection error stall');
    });

    // Emitted when the connection to the Twitter Stream API return an HTTP error code.
    // This error event are normally emitted if there are HTTP errors during the connection process.
    // When this event is emitted a exponentially reconnect will start.
    // The reconnect will attempt a reconnect after 5 seconds
    // and increase the reconnect attempts exponentially up to 320 seconds.
    twitterStream.on('connection error http', httpStatusCode => {
      logger.warn('TwitterClient connection error http', httpStatusCode);
    });

    // Emitted when the connection to the Twitter Stream API are being rate limited.
    // Twitter does only allow one connection for each application to its Stream API.
    // Multiple connections or to rapid reconnects will cause a rate limiting to happen.
    // When this event is emitted a exponentially reconnect will start.
    // The reconnect will attempt a reconnect after 1 minute
    // and double the reconnect attempts exponentially.
    twitterStream.on('connection rate limit', httpStatusCode => {
      logger.warn('TwitterClient connection rate limit', httpStatusCode);
    });

    // Emitted when the connection to the Twitter Stream API throw an unexpected error
    // which are not within the errors defined by the Twitter Stream API documentation.
    // When this event is emitted the client will, if it can,
    // keep the connection to the Twitter Stream API and not attempt to reconnect.
    // Closing the connection and handling a possible reconnect must be handled by the consumer of the client.
    twitterStream.on('connection error unknown', error => {
      logger.warn('TwitterClient connection error unknown', error);
      if (client.twitter.started) reset();
    });

    // Emitted when the client receive a keep alive message from the Twitter Stream API.
    // The Twitter Stream API sends a keep alive message every 30 second
    // if no messages have been sendt to ensure that the connection are kept open.
    // This keep alive messages are mostly being used under the hood
    // to detect stalled connections and other connection issues.
    twitterStream.on('data keep-alive', () => {
      debug('data keep-alive');
      if (timerKeepAlive) clearTimeout(timerKeepAlive);
      timerKeepAlive = setTimeout(() => {
        logger.warn('RESETTING FROM LACK OF KEEP ALIVE SIGNAL');
        reset();
      }, 1000 * 90);
    });

    // Emitted if the client received an message from the Twitter Stream API
    // which the client could not parse into an object or handle in some other way.
    twitterStream.on('data error', error => {
      logger.error('data error', error);
    });

    // Emitted when a Tweet occur in the stream.
    twitterStream.on('data', tweet => {
      processTweet(client, tweet);
    });
  }

  function getUser(n) {
    return new Promise((resolve, reject) => {
      twitterApi.get('users/lookup', { screen_name: n }, (err, body, res) => {
        if (err || res.statusCode !== 200) {
          reject(err || res.statusCode);
        } else {
          resolve(body);
        }
      });
    });
  }

  async function reset() {
    debug('reset()');
    client.twitter.started = false;
    if (timerKeepAlive) clearTimeout(timerKeepAlive);
    if (timerReloadCheck) clearInterval(timerReloadCheck);
    try {
      await twitterStream.close();
    } catch (e) {
      logger.error(e);
    }
    start().catch(logger.error);
  }

  function tweetTest(id) {
    return new Promise((resolve, reject) => {
      twitterApi.get('statuses/show', { id, tweet_mode: 'extended' },
        (err, data, response) => { // eslint-disable-line no-unused-vars
          if (err) return reject(err);
          return resolve(processTweet(client, data));
        });
    });
  }

  function reloadCheck() {
    debug('reloadCheck()');
    if (client.twitter.reload) {
      client.twitter.reload = false;
      reset();
      return;
    }
    client.mongo.twitterChannels.find({})
      .then(results => {
        const newIds = getTwitterUserIds(client, results);
        if (newIds.length !== client.twitter.ids.length) {
          reset();
          return;
        }
        for (let i = 0; i < newIds.length; i++) {
          if (newIds[i] !== client.twitter.ids[i]) {
            module.exports.reset(client);
            break;
          }
        }
      })
      .catch(logger.error);
  }

  return {
    start,
    reset,
    getUser,
    tweetTest,
  };
};

async function processTweet(client, tweet) {
  debug(`Tweet: (${tweet.id_str})`);
  // Handle Tweet Deletions
  if (tweet.delete) return deleteTweet(client, tweet);
  // Exit if there is no user object on the tweet
  if (!tweet.user) return;
  // Exit if tweet is a reply. Unless responding to themselves (thread)
  if (tweet.in_reply_to_user_id_str && tweet.in_reply_to_user_id_str !== tweet.user.id_str) return;
  // Exit if tweet is not authored my a user we care about
  if (client.twitter.ids.indexOf(tweet.user.id_str) === -1) return;

  // Grab the proper tweet context
  const focusedTweet = tweet.retweeted_status || tweet;
  let text;
  let extendedEntities;
  if (focusedTweet.extended_tweet && focusedTweet.extended_tweet.full_text) {
    // Decode html entities in the twitter text string so they appear correctly (&amp)
    text = entities.decode(focusedTweet.extended_tweet.full_text);
    extendedEntities = focusedTweet.extended_tweet.extended_entities;
  } else {
    // Decode html entities in the twitter text string so they appear correctly (&amp)
    text = entities.decode(focusedTweet.full_text || focusedTweet.text);
    extendedEntities = focusedTweet.extended_entities;
  }

  // Exit if tweet is an @reply
  if (text.startsWith('@')) return;

  // This is a 'real' tweet
  debug(tweet);
  // Ensure no duplicate tweets get posted
  if (processedTweets.indexOf(tweet.id_str) !== -1) {
    return;
  }
  processedTweets.push(tweet.id_str);
  if (processedTweets.length > 20) {
    processedTweets.shift();
  }
  logger.info(`Processing Tweet (${tweet.user.screen_name || tweet.user.id_str}) (${tweet.id_str})`);
  client.count.tweets++;

  // Get any urls from the tweet text. NOT img or video urls
  // tweet.entities.urls always exists - defaults to an empty array
  // List to hold image and video urls
  const mediaUrls = [];
  // extended_entities doesn't exist if there are no media elements
  if (extendedEntities) {
    // The extended_entities.media property exists if any gif or image is present
    const media = extendedEntities.media;
    const escapedUrls = [];
    media.filter(m => m.type === 'photo')
      .forEach(m => {
        const uri = m.media_url_https;
        // Add image data to list
        mediaUrls.push({ image: uri });
        // Remove the uri string from the tweet string
        // Only once (Albums)
        if (escapedUrls.indexOf(m.url) === -1) {
          escapedUrls.push(m.url);
          text = text.replace(m.url, `<${m.url}>`);
        }
      });

    media.filter(m => m.type === 'animated_gif')
      .forEach(m => {
        // Get the mp4 data object
        const video = m.video_info.variants[0].url;
        // Remove the uri string from the tweet string// Use HTTPS media image as backup if conversion fails
        const image = m.media_url_https;
        // Add media data to list
        mediaUrls.push({ video, image });
        if (escapedUrls.indexOf(m.url) === -1) {
          escapedUrls.push(m.url);
          text = text.replace(m.url, `<${m.url}>`);
        }
      });
  }
  debug('media', JSON.stringify(mediaUrls, null, 2));

  // Trim any white space from removing urls
  const body = text.trim();
  // Start new string to post to discord
  let str = `\`\`\`qml\nNew Tweet from ${tweet.user.screen_name}:\`\`\`` +
    `<https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}>\n`;
  // Append Body if there was anything left after removing links and trimming
  if (body.length !== 0) {
    let nameRT;
    if (tweet.retweeted_status) nameRT = tweet.retweeted_status.user.screen_name || tweet.retweeted_status.user.name;
    str += `\n${nameRT ? `RT @${nameRT}: ` : ''}${body}\n`;
  }

  const promiseArray = mediaUrls.map(data => processMedia(data, tweet, client));

  Promise.all(promiseArray)
    .then(media => {
      debug('processed media results', JSON.stringify(media, null, 2));
      client.mongo.twitterChannels.findOne({ id: tweet.user.id_str })
        .then(result => {
          if (result) {
            const files = media.map(file => {
              const p = path.parse(file);
              return { attachment: file, name: p.base };
            });
            const channelSendArray = result.channels
              .map(c => client.channels.get(c.channel_id))
              .filter(c => c && c.permissionsFor(client.user).has(requiredPerms))
              .map(c => channelSend(c, str, files));
            Promise.all(channelSendArray)
              .then(messageData => {
                debug('message ids from tweet', messageData);
                return saveTweetMessageIds(client, messageData, tweet.id_str);
              })
              .then(() => {
                debug('Tweet message ids save successful');
                return removeTemp(client, tweet.id_str);
              })
              .catch(logger.error);
          }
        })
        .catch(logger.error);
    })
    .catch(logger.error);
}

function channelSend(channel, str, files) {
  return new Promise((resolve, reject) => {
    channel.send(str, { files })
      .then(message => resolve({ channelId: channel.id, messageId: message.id }))
      .catch(reject);
  });
}

function processMedia(data, tweet, client) {
  return new Promise((resolve, reject) => {
    if (!data.video && data.image) {
      resolve(data.image);
      return;
    }
    const d = {
      id: `${tweet.id_str}-${client.utils.getRandomInt(0, 1000000)}`,
      uri: data.video,
      client,
    };
    createTempDir(d)
      .then(saveVideo)
      .then(createFramesDir)
      .then(createFrames)
      .then(createGIF)
      .then(o => {
        if (o.gif) {
          resolve(o.gif);
        } else {
          reject();
        }
      })
      .catch(reject);
  });
}

// Creates a unique folder with the tweet id for easy cleanup
function createTempDir(data) {
  return new Promise((resolve, reject) => {
    data.tweetDir = path.join(data.client.tempDir, data.id.split('-')[0]);
    fs.exists(data.tweetDir, (exists) => {
      if (exists) {
        resolve(data);
      } else {
        fs.mkdir(data.tweetDir, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  });
}

// Save MP4 to temp tweet folder
function saveVideo(data) {
  return new Promise((resolve, reject) => {
    data.mp4 = path.join(data.tweetDir, `${data.id}.mp4`);
    request.get(data.uri, { encoding: null })
      .then(b => {
        fs.writeFile(data.mp4, b.body, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      })
      .catch(reject);
  });
}

// Create a directory for captured frames
function createFramesDir(data) {
  return new Promise((resolve, reject) => {
    data.framesDir = path.join(data.tweetDir, data.id);
    fs.exists(data.framesDir, (exists) => {
      if (exists) {
        resolve(data);
      } else {
        fs.mkdir(data.framesDir, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      }
    });
  });
}

// Use ffmpeg to get images of the movie at intervals and save them to the frames dir
function createFrames(data) {
  return new Promise((resolve, reject) => {
    data.frames = path.join(data.framesDir, '/ffout%03d.png');
    exec(`ffmpeg -i "${data.mp4}" -vf scale=250:-1:flags=lanczos,fps=10 "${data.frames}"`,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
  });
}

// Use GraphicsMagik to convert frames into a gif
function createGIF(data) {
  return new Promise((resolve, reject) => {
    const frames = data.frames.replace('ffout%03d.png', 'ffout*.png');
    data.gif = path.join(data.tweetDir, `${data.id}.gif`);
    exec(`gm convert -loop 0 "${frames}" "${data.gif}"`,
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
  });
}

function removeTemp(client, id) {
  return new Promise((resolve, reject) => {
    const p = path.join(client.tempDir, id);
    debug('removing', p);
    fs.exists(p, (exists) => {
      debug('folder exists', exists);
      if (exists) {
        if (process.platform === 'win32') {
          exec(`rmdir "${p}" /s /q`, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          exec(`rm -rf "${p}"`, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        }
      }
    });
  });
}

function saveTweetMessageIds(client, data, tweetId) {
  return new Promise((resolve, reject) => {
    const tweetMessages = {
      tweet_id: tweetId,
      messages: data,
    };
    const entry = client.mongo.tweetMessages(tweetMessages);
    entry.save()
      .then(resolve)
      .catch(reject);
  });
}

function getTwitterUserIds(client, results) {
  return results.filter(x => {
    const channels = x.channels
      .filter(c => {
        const channel = client.channels.get(c.channel_id);
        return channel && channel.permissionsFor(client.user).has(requiredPerms);
      });
    return channels.length > 0;
  }).map(r => r.id);
}

function getResolvableChannelsCount(client, results) {
  const ids = getTwitterUserIds(client, results);
  return results.filter(x => ids.indexOf(x.id) !== -1)
    .reduce((a, b) => {
      const num = b.channels.reduce((c, d) => {
        const channel = client.channels.get(d.channel_id);
        if (channel && channel.permissionsFor(client.user).has(requiredPerms)) {
          c++;
        }
        return c;
      }, 0);
      return a + num;
    }, 0);
}

function deleteTweet(client, tweet) {
  client.mongo.tweetMessages.findOne({ tweet_id: tweet.delete.status.id_str })
    .then(result => {
      if (result && result.messages) {
        result.messages.forEach(msg => {
          const uri = `https://discordapp.com/api/channels/${msg.channelId}/messages/${msg.messageId}`;
          debug(uri);
          request.delete(uri)
            .set({ Authorization: `Bot ${config.bot_token}` })
            .then(() => {
              debug('Twitter message deleted OK');
            })
            .catch(err => {
              logger.error('Error deleting twitter message', err);
            });
        });
      }
    })
    .catch(logger.error);
}
