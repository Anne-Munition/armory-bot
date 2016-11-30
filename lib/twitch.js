'use strict';
const logger = require('winston');
const config = require('../config');
const utils = require('./utilities');

logger.debug('Loading TwitchLive Module');

let lastState = null;

module.exports = function TwitchLive() {
  function start(client) {
    logger.info('Starting Twitch Client');

    setTimeout(() => {
      checkLive(client);
    }, 1000 * 5);

    setInterval(() => {
      checkLive(client);
    }, 1000 * 60);
  }

  return {
    start,
  };
};
// TODO: Need to store how many channels and users we are streaming
function checkLive(client) {
  // Get list of ids to check who is live and who is not
  client.mongo.twitchChannels.find({})
    .then(results => {
      if (results) {
        const ids = results.map(r => r.twitch_id);
        const idsArray = [];
        while (ids.length > 100) {
          idsArray.push(ids.splice(0, 100));
        }
        idsArray.push(ids);
        const promiseArray = idsArray.map(i => {
          const uri = `https://api.twitch.tv/kraken/streams?channel=${i.join(',')}` +
            `&stream_type=live&client_id=${config.twitch.client_id}&api_version=5`;
          logger.debug(uri);
          return queryStreams(uri);
        });
        Promise.all(promiseArray)
          .then(promiseResults => {
            client.twitch.waiting = [];
            const merged = [].concat(...promiseResults);
            if (lastState) {
              merged.forEach(stream => {
                // Continue if stream exists that lastState does not have
                const liveID = stream.channel._id.toString();
                const mongoData = results.find(x => x.twitch_id === liveID);
                if (!mongoData) {
                  logger.error('No mongo data, this shouldn\'t happen');
                  return;
                }
                const inLastState = lastState.find(x => x.channel._id.toString() === liveID);
                if (inLastState) {
                  const lastGame = inLastState.game;
                  if (lastGame !== stream.game) {
                    postChange(client, mongoData, stream, lastGame);
                    return;
                  }
                  return;
                }
                postStart(client, mongoData, stream);
              });
            }
            lastState = merged;
          })
          .catch(logger.error);
      }
    })
    .catch(logger.error);
}

function queryStreams(uri) {
  return new Promise((resolve, reject) => {
    utils.jsonRequest(uri)
      .then(body => {
        resolve(body.streams);
      })
      .catch(reject);
  });
}

function postStart(client, mongoData, twitchData) {
  // Resolve all channels
  logger.debug(`Attempting to post stream start to ${mongoData.channels.length} channel(s)`);
  const name = twitchData.channel.display_name || twitchData.channel.name;
  const str = `:movie_camera: **${name}** just started streaming **${game(twitchData.game)}**` +
    `\n<${twitchData.channel.url}>`;
  mongoData.channels.map(c => client.channels.get(c.channel_id))
    .filter(c => c)
    .forEach(c => {
      c.sendMessage(str).catch(logger.error);
    });
}

function postChange(client, mongoData, twitchData, oldGame) {
  logger.debug(`Attempting to post game change to ${mongoData.channels.length} channel(s)`);
  const name = twitchData.channel.display_name || twitchData.channel.name;
  const str = `:movie_camera: **${name}** just changed games from` +
    ` **${game(oldGame)}** to **${game(twitchData.game)}**\n<${twitchData.channel.url}>`;
  mongoData.channels.map(c => client.channels.get(c.channel_id))
    .filter(c => c)
    .forEach(c => {
      c.sendMessage(str).catch(logger.error);
    });
}

function game(g) {
  if (g === '') {
    return '__NONE__';
  } else {
    return g;
  }
}
