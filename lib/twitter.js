'use strict';
const logger = require('winston');
const config = require('../config');
const Twit = require('twit');
const Entities = require('html-entities').AllHtmlEntities;
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const request = require('snekfetch');
const debug = require('debug')('twitterClient');

debug('Loading TwitterStream Module');

const T = new Twit({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token: config.twitter.access_token_key,
  access_token_secret: config.twitter.access_token_secret,
  timeout_ms: 60 * 1000,
});

const entities = new Entities();
const processedTweets = [];
let timerReloadCheck = null;
const requiredPerms = ['SEND_MESSAGES', 'ATTACH_FILES'];
let stream;

module.exports = {
  start: async client => {
    // Don't allow duplicate clients to run
    if (client.twitter.started) {
      debug('The Twitter client was started despite already having been started');
      return;
    }
    client.twitter.started = true;
    logger.info('Starting Twitter Client');
    // Get all the twitter channels we want to follow
    const twitterChannels = await client.mongo.twitterChannels.find({});
    // Exit if we cannot get records, or there are no records. No twitter accounts have been added
    if (!twitterChannels || twitterChannels.length === 0) {
      debug('No twitter accounts have been added');
      return;
    }
    // Filter out only twitter ids where we have at least one resolvable channel to post to
    const ids = getTwitterUserIds(client, twitterChannels);
    // Twitter channels are registered, but not Discord channels are found with perms
    if (!ids || ids.length === 0) {
      debug('No Discord channels found with perms');
      return;
    }
    debug('Streaming Twitter accounts:', ids);
    // Store twitter ids
    client.twitter.ids = ids;
    // Store Number of resolvable channels
    client.twitter.channels = getResolvableChannelsCount(client, twitterChannels, ids);
    // Check every 2 minutes if we should reload the twitter client. Flagged from error or adding/removing users
    if (timerReloadCheck) clearInterval(timerReloadCheck);
    timerReloadCheck = setInterval(reloadCheck, 1000 * 60 * 2);
    // Connect to twitter stream
    stream = T.stream('statuses/filter', { follow: ids.join(',') });

    // Emitted when a connection attempt is made to Twitter.
    // The http request object is emitted.
    stream.on('connect', req => { // eslint-disable-line no-unused-vars
      debug('connecting to twitter...');
    });

    // Emitted when the response is received from Twitter.
    // The http response object is emitted.
    stream.on('connected', res => { // eslint-disable-line no-unused-vars
      debug('connection to twitter OK');
      logger.info('Connection to Twitter Successful');
      // Message all users who subscribed to be notified
      while (client.twitter.mentions.length > 0) {
        const m = client.twitter.mentions.shift();
        m.channel.send(`${m.user}, This channel will now receive tweets from **${m.screen_name}**`);
      }
    });

    // Emitted when a reconnection attempt to Twitter is scheduled.
    // If Twitter is having problems or we get rate limited,
    // we schedule a reconnect according to Twitter's reconnection guidelines.
    // The last http request and response objects are emitted,
    // along with the time (in milliseconds) left before the reconnect occurs.
    stream.on('reconnect', (req, res, connectInterval) => {
      debug(`reconnecting to twitter in ${connectInterval}`);
      logger.warn(`Reconnecting to twitter in ${connectInterval}`);
    });

    // Emitted when a disconnect message comes from Twitter.
    // This occurs if you have multiple streams connected to Twitter's API.
    // Upon receiving a disconnect message from Twitter,
    // Twit will close the connection and emit this event with the message details received from twitter.
    stream.on('disconnect', disconnectMessage => {
      debug('disconnected from twitter', disconnectMessage);
      logger.error('Disconnected from Twitter', disconnectMessage);
      if (client.twitter.started === true) {
        module.exports.reset(client);
      }
    });

    // Emitted each time an object is received in the stream.
    // This is a catch-all event that can be used to process any data received in the stream,
    // rather than using the more specific events documented below.
    stream.on('message', msg => { // eslint-disable-line no-unused-vars
      // debug('message', msg);
    });

    // Emitted each time a limitation message comes into the stream.
    stream.on('limit', limitMessage => {
      debug('limit', limitMessage);
      logger.warn('TwitterClient limit', limitMessage);
    });

    // Emitted each time a location deletion message comes into the stream.
    stream.on('scrub_geo', scrubGeoMessage => {
      debug('scrub_geo', scrubGeoMessage);
    });

    // This message is appropriate for clients using high-bandwidth connections, like the firehose.
    // If your connection is falling behind, Twitter will queue messages for you,
    // until your queue fills up, at which point they will disconnect you.
    stream.on('warning', warning => {
      debug('warning', warning);
      logger.warn('TwitterClient warning', warning);
    });

    // Emitted when Twitter sends back a status_withheld message in the stream.
    // This means that a tweet was withheld in certain countries.
    stream.on('status_withheld', withheldMsg => {
      debug('status_withheld', withheldMsg);
      logger.debug('Twitter status_withheld', withheldMsg);
    });

    stream.on('user_withheld', withheldMsg => {
      debug('user_withheld', withheldMsg);
      logger.debug('Twitter user_withheld', withheldMsg);
    });

    // Emitted when Twitter sends the "friends" preamble when connecting to a user stream.
    // This message contains a list of the user's friends, represented as an array of user ids.
    // If the stringify_friend_ids parameter is set,
    // the friends list preamble will be returned as Strings (instead of Numbers).
    stream.on('friends', friendsMsg => {
      debug('friends', friendsMsg);
      logger.debug('Twitter friends', friendsMsg);
    });

    // Emitted each time a status (tweet) comes into the stream.
    stream.on('tweet', tweet => {
      debug(`Tweet: (${tweet.id_str})`);
      // Exit if there is not user object on the tweet
      if (!tweet.user) {
        debug('No user object in the tweet, exiting');
        return;
      }
      // Exit if tweet is not from any of the registered owner ids. 'RT'
      if (ids.indexOf(tweet.user.id_str) === -1) {
        debug('Tweet owner id was not in ids list, was an @response, exiting');
        return;
      }
      // Exit if used reply button to reply. 'PM'
      // Exit if message is an @ to another user. 'PM'
      if (tweet.in_reply_to_status_id !== null || tweet.in_reply_to_user_id !== null) {
        debug('reply button or message is an @ to another user, PM, exiting');
        return;
      }
      // This is a 'real' tweet
      processTweet(client, tweet);
    });

    // Emitted each time a status (tweet) deletion message comes into the stream.
    stream.on('delete', deleteMessage => {
      client.mongo.tweetMessages.findOne({ tweet_id: deleteMessage.id_str })
        .then(result => {
          if (result && result.messages) {
            result.messages.forEach(msg => {
              const uri = `https://discordapp.com/api/channels/${msg.channelId}/messages/${msg.messageId}`;
              logger.debug(uri);
              request.delete(uri)
                .set({ Authorization: `Bot ${config.bot_token}` })
                .then(() => {
                  logger.debug('Twitter message deleted OK');
                })
                .catch(err => {
                  logger.error('Error deleting twitter message', err);
                });
            });
          }
        })
        .catch(logger.error);
    });
  },

  getUser: n => new Promise((resolve, reject) => {
    T.get('users/lookup', { screen_name: n }, (err, body, res) => {
      if (err || res.statusCode !== 200) {
        reject(err || res.statusCode);
      } else {
        resolve(body);
      }
    });
  }),

  reset: client => {
    debug('reset()');
    if (timerReloadCheck) clearInterval(timerReloadCheck);
    stop(client);
    module.exports.start(client).catch(logger.error);
  },

  testTweet: (client, id) => {
    T.get('statuses/show/:id', { id }, (err, data, response) => {
      processTweet(client, data);
    });
  },
}

function reloadCheck(client) {
  debug('reloadCheck()');
  if (client.twitter.reload) {
    client.twitter.reload = false;
    module.exports.reset(client);
    return;
  }
  client.mongo.twitterChannels.find({})
    .then(results => {
      const newIds = getTwitterUserIds(client, results);
      if (newIds.length !== client.twitter.ids.length) {
        module.exports.reset(client);
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

function stop(client) {
  debug('stop()');
  if (timerReloadCheck) clearInterval(timerReloadCheck);
  client.twitter.started = false;
  if (stream) stream.close();
}


function processTweet(client, tweet) {
  // Ensure no duplicate tweets get posted
  if (processedTweets.indexOf(tweet.id_str) !== -1) {
    return;
  }
  processedTweets.push(tweet.id_str);
  if (processedTweets.length > 20) {
    processedTweets.shift();
  }
  logger.info(`Processing Tweet (${tweet.user.id_str}) (${tweet.id_str})`);
  client.count.tweets++;
  /*  fs.writeFile(`./tweet-${tweet.id_str}`, JSON.stringify(tweet, null, 2), 'utf8', err => {
      if (err) logger.error(err);
    });*/
  // Log tweet text as reference
  const short = tweet.text.substring(0, 50);
  debug(JSON.stringify(tweet, null, 2));
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
    str += `\n${body}\n`;
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

