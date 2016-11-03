'use strict';
exports.info = {
  desc: 'Stream an Audio Only Twitch stream to a voice channel.',
  usage: '<channel>',
  aliases: [],
};

const config = require('../../config');
const parsers = require('playlist-parser');
const lame = require('lame');
const ffmpeg = require('ffmpeg');
const logger = require('winston');
const utils = require('../utilities');
const path = require('path');
const fs = require('fs');

const M3U = parsers.M3U;

let streaming = false;
let audioTimer;
let encoder;
let decoder;
const interval = 10;

exports.run = (client, msg, params = []) => {
  // Restricted to DBKynd only as this is illegal maybe? I emailed Twitch but they have not responded
  if (msg.author.id !== '84770528526602240') {
    return;
  }
  if (!msg.member.voiceChannel) {
    msg.reply('You need to be in a Voice channel to run this command.');
    return;
  }
  if (params.length === 0) {
    msg.reply(`Please enter a channel name. \`\`${client.prefix}stream <channel>\`\``);
    return;
  }
  params = params.map(p => p.toLowerCase());

  if (params[0] === 'stop') {
    if (streaming) {
      if (audioTimer) {
        clearInterval(audioTimer);
      }
      msg.member.voiceChannel.leave();
      streaming = false;
    } else {
      msg.reply('Nothing is currently being streamed.');
    }
    utils.finish(client, msg, exports.name);
    return;
  }

  isLive(params[0])
    .then(getToken)
    .then(data => getSources(params[0], data))
    .then(getAudioSource)
    .then(m3u8_uri => {
      streaming = true;
      startVoice(m3u8_uri);
    })
    .catch(logger.error);

  function isLive(channel) {
    return new Promise((resolve, reject) => {
      const uri = `https://api.twitch.tv/kraken/streams/${channel}?client_id=${config.twitch.client_id}`;
      logger.debug(uri);
      utils.jsonRequest(uri)
        .then(body => {
          if (body.stream === null) {
            msg.channel.sendMessage(`\`\`${channel}\`\` is not currently live.`);
            reject(`${channel} is not currently live.`);
          } else {
            resolve(channel);
          }
        })
        .catch(err => {
          if (err === 404) {
            msg.channel.sendMessage(`The channel \`\`${channel}\`\` does not exist.`);
            reject(`The channel ${channel} does not exist.`);
          } else {
            reject(err);
          }
        });
    });
  }

  function getToken(channel) {
    return new Promise((resolve, reject) => {
      const uri = `http://api.twitch.tv/api/channels/${channel}/access_token?client_id=` +
        `${config.twitch.client_id}`;
      logger.debug(uri);
      utils.jsonRequest(uri)
        .then(body => {
          if (body.token && body.sig) {
            resolve(body);
          } else {
            reject('Missing token  and\\or sig');
          }
        })
        .catch(reject);
    });
  }

  function getSources(channel, data) {
    return new Promise((resolve, reject) => {
      const uri = `http://usher.twitch.tv/api/channel/hls/${channel}.m3u8?player=twitchweb&&token=` +
        `${data.token}&sig=${data.sig}&allow_audio_only=true&allow_source=true&type=any&p=` +
        `${utils.getRandomInt(0, 999999)}`;
      logger.debug(uri);
      utils.utfRequest(uri)
        .then(resolve)
        .catch(reject);
    });
  }

  function getAudioSource(sourceList) {
    return new Promise((resolve, reject) => {
      const sources = M3U.parse(sourceList);
      for (let i = 0; i < sources.length; i++) {
        if (sources[i] !== undefined) {
          if (sources[i].title.includes('audio_only')) {
            if (sources[i].file) {
              logger.debug(sources[i].file);
              resolve(sources[i].file);
              return;
            }
          }
        }
      }
      reject('Unable to find audio_only source');
    });
  }

  function startVoice(playlistUri) {
    encoder = new lame.Encoder({ channels: 2, bitDepth: 16, sampleRate: 44100 });
    decoder = new lame.Decoder();
    decoder.on('format', () => {
      decoder.pipe(encoder);
    });

    decoder.on('error', err => {
      logger.error(err);
    });
    encoder.on('error', err => {
      logger.error(err);
    });

    msg.member.voiceChannel.join()
      .then(connection => {
        connection.playStream(encoder, { seek: 0, volume: 1.0 });
        connection.on('error', (err) => {
          logger.error(err);
        });
      })
      .catch(logger.error);

    const tracks = [];
    const processed = [];
    let processing = false;

    utils.finish(client, msg, exports.name);
    getAudioLoop(playlistUri);
    audioTimer = setInterval(() => {
      getAudioLoop(playlistUri);
    }, interval * 1000);

    function getAudioLoop(uri) {
      utils.jsonRequest(uri)
        .then(m3u8 => {
          m3u8 = M3U.parse(m3u8);
          const newTracks = m3u8
            .filter(x => x !== undefined)
            .map(x => x.file)
            .filter(x => processed.indexOf(x) === -1);
          logger.debug(newTracks.length, 'new tracks');
          newTracks.forEach(t => {
            logger.debug(t);
            tracks.push(t);
            processed.push(t);
          });
          if (!processing) {
            logger.debug('processing true');
            processing = true;
            processTsData();
          }
        })
        .catch(logger.warn);
    }

    function processTsData() {
      function next() {
        logger.debug('next', tracks.length);
        if (tracks.length === 0) {
          logger.debug('processing false');
          processing = false;
          return;
        }
        const file = tracks.shift();
        logger.debug('file', file);
        const tsUri = playlistUri.replace('index-live.m3u8', file);
        let ts;
        let audio;
        utils.bufferRequest(tsUri)
          .then(buffer => saveTSFile(buffer, file))
          .then(f => {
            ts = f;
            return convertFile(f);
          })
          .then(f => {
            audio = f;
            return readAudio(f);
          })
          .then(buffer => {
            if (decoder) {
              decoder.write(buffer);
            }
            fs.unlink(ts, err => {
              if (err) {
                logger.error('Error un-linking stream ts file', ts, err);
              }
            });
            fs.unlink(audio, err => {
              if (err) {
                logger.error('Error un-linking stream mp3 file', audio, err);
              }
            });
            while (processed.length > 20) {
              processed.shift();
            }
            next();
          })
          .catch(err => {
            if (err) {
              logger.warn(err);
            }
            next();
          });
      }

      next();
    }
  }
};

function convertFile(filepath) {
  return new Promise((resolve, reject) => {
    const process = new ffmpeg(filepath); // eslint-disable-line
    process.then(video => {
      video.fnExtractSoundToMP3(filepath.replace('.ts', '.mp3'), (error, file) => {
        if (error) {
          reject(error);
        } else {
          resolve(file);
        }
      });
    }, err => {
      reject(err);
    });
  });
}

function saveTSFile(buffer, file) {
  return new Promise((resolve, reject) => {
    const tsPath = path.join(__dirname, '../../temp/', file);
    fs.writeFile(tsPath, buffer, err => {
      if (err) {
        reject(err);
      } else {
        resolve(tsPath);
      }
    });
  });
}

function readAudio(filepath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filepath, { encoding: null }, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}
