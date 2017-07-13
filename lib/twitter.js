'use strict';
const logger = require('winston');
const config = require('../config');
const Twitter = require('twitter-stream-api');
const TwitterAPI = require('twitter');
const Entities = require('html-entities').AllHtmlEntities;
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const request = require('request');

logger.debug('Loading TwitterStream Module');
// Get new twitter client
const twitter = new Twitter({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  token: config.twitter.access_token_key,
  token_secret: config.twitter.access_token_secret,
});

const twitterAPI = new TwitterAPI({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token_key: config.twitter.access_token_key,
  access_token_secret: config.twitter.access_token_secret,
});

const entities = new Entities();
const processedTweets = [];
let timerCheck = null;

module.exports = function TwitterStream(client) {
  function start() {
    // Don't allow duplicate clients to run
    if (client.twitter.started) {
      // Exit if the client is already started
      return;
    } else {
      // Save that we have started the client
      client.twitter.started = true;
    }
    logger.info('Starting Twitter Client');
    client.mongo.twitterChannels.find({})
      .then(results => {
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
        // Store # of streaming twitter ids
        client.twitter.ids = ids;
        // Store Number of resolvable channels
        client.twitter.channels = getResolvableChannelsCount(client, results, ids);
        // Check every 10 minutes if we should reload the twitter client. Flagged from error or adding/removing users
        if (timerCheck) clearInterval(timerCheck);
        timerCheck = setInterval(reloadCheck, 1000 * 60 * 2);
        // Connect to twitter stream
        twitter.stream('statuses/filter', { follow: ids.join(',') });

        twitter.on('connection success', () => {
          logger.debug('Twitter Client connection success');
          while (client.twitter.mentions.length > 0) {
            const m = client.twitter.mentions.shift();
            m.channel.send(`${m.user}, This channel will now receive tweets from **${m.screen_name}**`);
          }
        });

        twitter.on('connection aborted', () => {
          client.utils.ownerError('Twitter Client', client, 'Twitter Client connection aborted. Restarting...');
          if (client.twitter.started === true) reset();
        });

        twitter.on('connection error network', err => {
          logger.warn('Twitter Client connection error network', err);
        });

        twitter.on('connection error stall', () => {
          logger.warn('Twitter Client connection error stall');
        });

        twitter.on('connection error http', (httpStatusCode) => {
          logger.warn('Twitter Client connection error http', httpStatusCode);
        });

        twitter.on('connection rate limit', (httpStatusCode) => {
          logger.warn('Twitter Client connection rate limit', httpStatusCode);
        });

        twitter.on('connection error unknown', err => {
          logger.warn('Twitter Client connection error unknown', err);
          reset();
        });

        twitter.on('data error', err => {
          logger.warn('Twitter Client data error', err);
        });

        twitter.on('data', tweet => {
          // If tweet is a deletion, delete all the corresponding discord messages
          if (tweet.delete) {
            logger.debug('Tweet event was a tweet deletion');
            deleteTweet(client, tweet);
            return;
          }
          // Exit if tweet is not from any of the registered owner ids. 'RT'
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
          // This is a 'real' tweet
          processTweet(client, tweet);
        });
      })
      .catch(logger.error);
  }

  function getUser(n) {
    return new Promise((resolve, reject) => {
      twitterAPI.get('users/lookup', { screen_name: n }, (err, body, res) => {
        if (err || res.statusCode !== 200) {
          reject(err || res.statusCode);
        } else {
          resolve(body);
        }
      });
    });
  }

  function stop() {
    logger.debug('Twitter Stop');
    if (timerCheck) clearInterval(timerCheck);
    client.twitter.started = false;
    twitter.close();
  }

  function reset() {
    logger.debug('Twitter Reset');
    if (timerCheck) clearInterval(timerCheck);
    stop();
    start();
  }

  function reloadCheck() {
    if (client.twitter.reload) {
      client.twitter.reload = false;
      reset();
      return;
    }
    client.mongo.twitterChannels.find({})
      .then(results => {
        const newIds = getResolvableIds(client, results);
        if (newIds.length !== client.twitter.ids.length) {
          reset();
          return;
        }
        for (let i = 0; i < newIds.length; i++) {
          if (newIds[i] !== client.twitter.ids[i]) {
            reset();
            break;
          }
        }
      })
      .catch(logger.error);
  }

  return {
    start,
    getUser,
    reset,
  };
};

function processTweet(client, tweet) {
  // Ensure no duplicate tweets get posted
  if (processedTweets.indexOf(tweet.id_str) !== -1) {
    return;
  }
  processedTweets.push(tweet.id_str);
  if (processedTweets.length > 20) {
    processedTweets.shift();
  }
  logger.info('Twitter activity');
  client.count.tweets++;
  // Log tweet text as reference
  const short = tweet.text.substring(0, 50);
  logger.debug(JSON.stringify(tweet));
  logger.info(`${short}...`);
  // Decode html entities in the twitter text string so they appear correctly (&amp)
  let text;
  let extendedEntities;
  if (tweet.extended_tweet && tweet.extended_tweet.full_text) {
    text = entities.decode(tweet.extended_tweet.full_text);
    extendedEntities = tweet.extended_tweet.extended_entities;
  } else {
    text = entities.decode(tweet.text);
    extendedEntities = tweet.extended_entities;
  }
  // Get any urls from the tweet text. NOT img or video urls
  // tweet.entities.urls always exists - defaults to an empty array
  // if (tweet.entities.urls.length > 0) {}
  // List to hold image and video urls
  const mediaUrls = [];
  // extended_entities doesn't exist if there are no media elements
  if (extendedEntities) {
    // The media property exists if any gif or image is present
    const media = extendedEntities.media;
    const escaped = [];
    media.filter(m => m.type === 'photo')
      .forEach(m => {
        const uri = m.media_url_https;
        // Add image data to list
        mediaUrls.push({ image: uri });
        // Remove the uri string from the tweet string
        // Only once (Albums)
        if (escaped.indexOf(m.url) === -1) {
          escaped.push(m.url);
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
        if (escaped.indexOf(m.url) === -1) {
          escaped.push(m.url);
          text = text.replace(m.url, `<${m.url}>`);
        }
      });
  }
  logger.debug('media', JSON.stringify(mediaUrls));

  // Trim any white space from removing urls
  const body = text.trim();
  // Start new string to post to discord
  let str = `\`\`\`qml\nNew Tweet from ${tweet.user.screen_name}:\`\`\`` +
    `<https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}>\n`;
  // Append Body if there was any left after removing links
  if (body.length !== 0) {
    str += `\n${body}\n`;
  }

  const promiseArray = mediaUrls.map(data => processVideo(data, tweet, client));

  Promise.all(promiseArray)
    .then(media => {
      logger.debug('processed media results', media);
      client.mongo.twitterChannels.findOne({ id: tweet.user.id_str })
        .then(result => {
          if (result) {
            const files = media.map(file => {
              const p = path.parse(file);
              return { attachment: file, name: p.base };
            });
            const channelSendArray = result.channels
              .map(c => client.channels.get(c.channel_id))
              .map(c => channelSend(c, str, files));
            Promise.all(channelSendArray)
              .then(messageIds => {
                logger.debug('message ids from tweet', messageIds);
                return saveTweetMessageIds(client, messageIds, tweet.id_str);
              })
              .then(() => {
                logger.debug('Tweet message ids save successful');
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
      .then(message => resolve(message.id))
      .catch(reject);
  });
}

function processVideo(data, tweet, client) {
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
    data.client.utils.requestBuffer(data.uri)
      .then(b => {
        fs.writeFile(data.mp4, b, (err) => {
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
    logger.debug('removing', p);
    fs.exists(p, (exists) => {
      logger.debug('folder exists', exists);
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
      channels: data,
    };
    const entry = client.mongo.tweetMessages(tweetMessages);
    entry.save()
      .then(resolve)
      .catch(reject);
  });
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
