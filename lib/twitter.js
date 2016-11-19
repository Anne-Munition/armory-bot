'use strict';
const logger = require('winston');
const config = require('../../config.json');
const Twitter = require('twitter');
const Entities = require('html-entities').AllHtmlEntities;
const exec = require('child_process').exec;
const fs = require('fs');
const path = require('path');
const utils = require('./utilities');

logger.debug('Loading Twitter Module');
// Get new twitter client
const twitter = new Twitter({
  consumer_key: config.twitter.consumer_key,
  consumer_secret: config.twitter.consumer_secret,
  access_token_key: config.twitter.access_token_key,
  access_token_secret: config.twitter.access_token_secret,
});

const entities = new Entities();
let resetTimer = null;

module.exports = function TwitterStream() {
  function start(client) {
    if (client.twitter.started) {
      return;
    } else {
      client.twitter.started = true;
    }
    logger.info('Starting Twitter client');
    client.mongo.twitterChannels.find({})
      .then(results => {
        if (results.length === 0) {
          return;
        }
        const ids = results.map(x => x.id);
        logger.debug(ids);
        twitter.stream('statuses/filter', { follow: ids.join(',') }, stream => {
          if (resetTimer) {
            clearInterval(resetTimer);
          }
          resetTimer = setInterval(() => {
            reset(client, stream);
          }, 1000 * 60 * 15);
          client.twitter.reload = false;
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
              // TODO: Delete tweets
              // myEvents.emit('delete_tweet', tweet);
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
            // This is a 'real' tweet
            processTweet(client, tweet);
          });
        });
      })
      .catch(logger.error);
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

  function stop(client, stream) {
    stream.destroy();
    client.twitter.started = false;
  }

  function reset(client, stream) {
    logger.debug('Twitter Reset?', client.twitter.reload);
    if (client.twitter.reload) {
      stop(client, stream);
      start(client);
    }
  }

  return {
    start,
    getUser,
  };
};

function processTweet(client, tweet) {
  logger.info('Twitter activity');
  // Log tweet text as reference
  const short = tweet.text.substring(0, tweet.text.length > 50 ? 50 : tweet.text.length);
  logger.debug(JSON.stringify(tweet));
  logger.info(`${short}...`);
  // Decode html entities in the twitter text string so they appear correctly (&amp)
  let text = entities.decode(tweet.text);
  // Get any urls from the tweet text. NOT img or video urls
  // tweet.entities.urls always exists - defaults to an empty array
  // if (tweet.entities.urls.length > 0) {}

  // List to hold image and video urls
  const mediaUrls = [];
  // extended_entities doesn't exist if there are no media elements
  if (tweet.extended_entities) {
    // The media property exists if any gif or image is present
    const media = tweet.extended_entities.media;

    media.filter(m => m.type === 'photo')
      .forEach(m => {
        const uri = m.media_url_https;
        // Remove the uri string from the tweet string
        text = text.replace(m.url, `<${m.url}>`);
        // Add image data to list
        mediaUrls.push({ image: uri });
      });

    media.filter(m => m.type === 'animated_gif')
      .forEach(m => {
        // Get the mp4 data object
        const video = m.video_info.variants[0].url;
        // Remove the uri string from the tweet string
        text = text.replace(m.url, `<${m.url}>`);
        // Use HTTPS media image as backup if conversion fails
        const image = m.media_url_https;
        // Add media data to list
        mediaUrls.push({ video, image });
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
    .then(results => {
      logger.debug('processVideo results', results);
      /*removeTemp(client, tweet.id_str)
        .then(() => {

        })
        .catch(logger.error);*/
    })
    .catch(logger.error);
}

/*function postToChannels(client, tweet, str, results) {
  return new Promise((resolve, reject) => {
    client.mongo.twitterChannels.findOne({ id: tweet.user.id_str })
      .then(result => {
        logger.debug('twitterChannels match result', JSON.stringify(result, null, 2));
        if (result) {
         resolve(result.channels.map(c => c.channel_id)
            .map(c => client.channels.get(c))
            .filter(c => c)
            .map(c => c.sendMessage(str)));
        }
      })
      .catch(reject);
  });
}*/

function processVideo(data, tweet, client) {
  return new Promise((resolve, reject) => {
    if (!data.video && data.image) {
      resolve(data.image);
      return;
    }
    const d = {
      id: `${tweet.id_str}-${utils.getRandomInt(0, 1000000)}`,
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
    utils.bufferRequest(data.uri)
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
    fs.exists(p, (exists) => {
      if (exists) {
        if (process.platform === 'win32') {
          exec(`rmdir "${p}" /s /q`, (err) => {
            if (err) {
              reject(new Error(`Unable to remove the folder at: ${p}`));
            } else {
              resolve();
            }
          });
        } else {
          exec(`rm -rf "${p}"`, (err) => {
            if (err) {
              reject(new Error(`Unable to remove the folder at: ${p}`));
            } else {
              resolve();
            }
          });
        }
      }
    });
  });
}
