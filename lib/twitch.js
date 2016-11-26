'use strict';
const logger = require('winston');
const config = require('../config');
const utils = require('./utilities');

logger.debug('Loading TwitchLive Module');

let lastState = null;

module.exports = function TwitchLive() {
  function start(client) {
    logger.debug('Starting TwitchLive functionality');

    setTimeout(() => {
      checkLive(client);
    }, 1000 * 5);

    setInterval(() => {
      checkLive(client);
    }, 1000 * 60 * 2);
  }

  return {
    start,
  };
};

function checkLive(client) {
  // Get list of ids to check who is live and who is not
  client.mongo.twitchChannels.find({})
    .then(results => {
      if (results) {
        logger.debug('twitch check live mongo results', results.length);
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
            logger.debug('promiseResults', promiseResults.length);
            const merged = [].concat(...promiseResults);
            logger.debug('merged', merged.length);
            if (lastState) {
              logger.debug('twitch live check, check for differences');
              merged.forEach(s => {
                // Continue if stream exists that lastState does not have
                const liveID = s.channel._id.toString();
                logger.debug('liveID', liveID, s.channel.name);
                const pos = client.twitch.ignore.indexOf(s.channel.name.toLowerCase());
                if (pos !== -1) {
                  // This channel was just added and we are seeing it live for the first time
                  // Remove it from the ignore list for next cycle
                  logger.debug('ignoring', s.channel.name);
                  client.twitch.ignore.splice(pos, 1);
                  return;
                }
                const inLastState = lastState.find(x => x.channel._id.toString() === liveID);
                if (inLastState) {
                  logger.debug(`${s.channel.name} was already seen live, exiting`);
                  return;
                }
                // The live id we are checking was not found in the last saved merged results
                // The channel must have just started streaming
                // Get data from mongo results and post to appropriate channels
                const mongoData = results.find(x => x.twitch_id === liveID);
                if (!mongoData) {
                  logger.error('No mongo data, this shouldn\'t happen');
                  return;
                }
                postToChannels(client, mongoData, s);
              });
            } else {
              logger.debug('first twitch live check, storing who is live');
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

function postToChannels(client, mongoData, twitchData) {
  // Resolve all channels
  logger.debug(`Attempting to post to ${mongoData.channels.length} channels`);
  const name = twitchData.channel.display_name || twitchData.channel.name;
  const str = `**${name}** has just started streaming on Twitch.tv!\nPlaying: **${twitchData.game}**\n` +
    `<${twitchData.channel.url}>`;
  mongoData.channels.map(c => client.channels.get(c.channel_id))
    .filter(c => c)
    .forEach(c => {
      c.sendMessage(str).catch(logger.error);
    });
}
