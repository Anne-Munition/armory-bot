'use strict';
const config = require('../config');
const Twitter = require('twitter');
const Entities = require('html-entities').AllHtmlEntities;
const exec = require('child_process').exec;
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const logger = require('winston');
const myEvents = require('./events');
const imageMin = require('imagemin');
const imageMinGifsicle = require('imagemin-gifsicle');

const entities = new Entities();

module.exports = function TwitterClient() {
  logger.debug('Loading Twitter Module');

  // Get new twitter client
  const twitter = new Twitter({
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    access_token_key: config.twitter.access_token_key,
    access_token_secret: config.twitter.access_token_secret,
  });

  // Count of how many reconnect attempts
  let reconnectCount = 0;
  // Timer that immediately starts a reconnect, but is canceled if a good connection occurs
  let reset;
  // Twitter screen name for Discord message header
  let screenName = '';

  // Connect to Twitter
  function twitterConnect() {
    logger.debug('Connecting to Twitter...');
    twitter.get('users/lookup', { user_id: config.twitter.access_token_key.split('-')[0] },
      (err, body, res) => {
        // This GET request requires auth. This is our credentials and availability check
        if (!err && res.statusCode === 200) {
          // Store connected Twitter screen name
          screenName = body[0].screen_name;
          // Start stream listener
          twitter.stream('user', { with: 'user' }, stream => {
            logger.info(`Successful connection to Twitter as '${screenName}'`);
            // This would be better implemented if a stream.on('connected') event existed
            reset = setTimeout(() => {
              // Reset count after 9 seconds. This gets canceled if a reconnect is required
              reconnectCount = 0;
            }, 9000);

            // New tweet data received
            stream.on('data', tweet => {
              // Exit if not a tweet but friends list
              if (tweet.friends) {
                return;
              }
              // If tweet is a deletion, delete all the corresponding discord messages
              if (tweet.delete) {
                myEvents.emit('delete_tweet', tweet);
                return;
              }
              // Exit if tweet not from the owner. 'RT'
              if (tweet.user.id_str !== config.twitter.access_token_key.split('-')[0]) {
                return;
              }
              // Exit if used reply button to reply. 'PM'
              // Exit if message is an @ to another user. 'PM'
              if (tweet.in_reply_to_status_id !== null || tweet.in_reply_to_user_id !== null) {
                return;
              }
              // This is a 'real' tweet
              handleTweet(tweet);
            });

            // Log when any errors occur on the twitter stream
            stream.on('error', e => {
              logger.error('Twitter stream error:', e);
            });

            // Fired on a unsuccessful login attempt or a disconnect
            stream.on('end', () => {
              logger.warn('Twitter stream disconnected');
              twitterReconnect();
            });
          });
        } else {
          // GET request failed
          logger.warn('Connection to Twitter failed');
          twitterReconnect();
        }
      });
  }

  // Connect on startup
  twitterConnect();

  // Reconnect to twitter
  function twitterReconnect() {
    // Stop reset count timer
    if (reset) {
      clearTimeout(reset);
    }
    // Error if reconnection attempts is over 100
    if (reconnectCount >= 100) {
      logger.error('Twitter reconnect failed an excessive amount');
      return;
    }
    // Add to reconnect count
    reconnectCount++;
    logger.info(`Attempting to reconnect to Twitter in ${reconnectCount * 10} seconds`);
    // Reconnect after x seconds
    setTimeout(() => {
      twitterConnect();
    }, 1000 * reconnectCount * 10);
  }

  setTimeout(() => {
    fs.readFile('tweet7', (err, result) => {
      if (!err) {
        handleTweet(JSON.parse(result));
      }
    });
  }, 5000);

  function handleTweet(tweet) {
    logger.info('Twitter activity');
    // Log tweet text as reference
    const short = tweet.text.substring(0, tweet.text.length > 50 ? 50 : tweet.text.length);
    logger.debug(JSON.stringify(tweet));
    logger.info(`${short}...`);
    // Decode html entities in the twitter text string so they appear correctly (&amp)
    let text = entities.decode(tweet.text);
    // Get any urls from the tweet text. NOT img or video urls
    // tweet.entities.urls always exists - defaults to an empty array

    const changeFlag = config.twitter.resolve_tco_links || 0;

    if (tweet.entities.urls.length > 0) {
      // If existing, alter the twitter url with the full url since Discord doesn't expand twitter links
      tweet.entities.urls
        .filter(u => u.expanded_url && u.display_url)
        .forEach(u => {
          if (changeFlag === 1) {
            text = text.replace(u.url, u.expanded_url);
          } else if (changeFlag === 2) {
            text = text.replace(u.url, `${u.url} [${u.display_url}]`);
          }
        });
    }

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
          text = text.replace(m.url, '');
          // Add image data to list
          mediaUrls.push({ image: uri });
        });

      media.filter(m => m.type === 'animated_gif')
        .forEach(m => {
          // Get the mp4 data object
          const video = m.video_info.variants[0].url;
          // Remove the uri string from the tweet string
          text = text.replace(m.url, '');
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
    let str = `\`\`\`New Tweet from ${screenName}\`\`\`<https://twitter.com/${screenName}/status/${tweet.id_str}>\n`;
    // Append Body if there was any left after removing links
    if (body.length !== 0) {
      str += `\n${body}\n`;
    }

    // After all video is ready
    processVideos(tweet, mediaUrls, data => {
      myEvents.emit('tweet', { id: tweet.id_str, str, media: data || {} });
    });
  }
};

function processVideos(tweet, data, callback) {
  logger.debug('Starting to process video', JSON.stringify(data));

  // Exit if there are no videos to process
  const videos = data.filter(x => x.video);
  if (!videos || videos.length === 0) {
    logger.debug('There are no videos to process');
    return callback(data);
  }
  logger.debug(`Videos: (${videos.length})`, JSON.stringify(videos));
  let count = 0;

  // After each video is converted
  function next() {
    count++;
    if (count >= videos.length) {
      return callback(data);
    } else {
      return null;
    }
  }

  videos.forEach(v => {
    // Exit if there is not a video url to download
    if (!v.video) {
      return;
    }
    // Initial data object to pass through our promise chain
    const d = {
      id: `${tweet.id_str}-${videos.indexOf(v)}`,
      uri: v.video,
    };

    createTempDir(d)
      .then(saveVideo)
      .then(createFramesDir)
      .then(createFrames)
      .then(createGIF)
      .then(createOutputDir)
      .then(compressGIF)
      .then(o => {
        if (o.output) {
          v.video = o.output;
        }
        next();
      })
      .catch(e => {
        logger.error('Error processing video from tweet', tweet.id_str, e);
        next();
      });
  });
  return null;
}

// Creates a unique folder with the tweet id for easy cleanup
function createTempDir(data) {
  return new Promise((resolve, reject) => {
    data.tweetDir = path.join(config.tempPath, data.id.split('-')[0]);
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
    fetch(encodeURI(data.uri))
      .then(r => r.buffer())
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

// Create a directory for captured frames
function createOutputDir(data) {
  return new Promise((resolve, reject) => {
    data.outputDir = path.join(data.tweetDir, 'output');
    fs.exists(data.outputDir, (exists) => {
      if (exists) {
        resolve(data);
      } else {
        fs.mkdir(data.outputDir, (err) => {
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

// Compress the gif to save on upload
function compressGIF(data) {
  return new Promise((resolve, reject) => {
    imageMin([data.gif], data.outputDir, {
      use: [
        imageMinGifsicle({
          optimize: 1,
        }),
      ],
    })
      .then(f => {
        if (f[0] && f[0].path) {
          data.output = f[0].path;
          resolve(data);
        } else {
          reject(new Error('Path not found from gif compression process'));
        }
      })
      .catch(reject);
  });
}

// Attempts to remove the temp tweet directory after all messages have been sent
myEvents.on('remove_temp', id => {
  const p = path.join(config.tempPath, id);
  fs.exists(p, (exists) => {
    if (exists) {
      if (process.platform === 'win32') {
        exec(`rmdir "${p}" /s /q`, (err) => {
          if (err) {
            logger.error('Unable to remove the folder at:', p);
          }
        });
      } else {
        exec(`rm -rf "${p}"`, (err) => {
          if (err) {
            logger.error('Unable to remove the folder at:', p);
          }
        });
      }
    }
  });
});
