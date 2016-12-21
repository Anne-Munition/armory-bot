'use strict';
const logger = require('winston');
const config = require('../config');
const utils = require('./utilities');

logger.debug('Loading TwitchLive Module');

let lastState = null;

module.exports = function TwitchLive(client) {
  function start() {
    logger.info('Starting Twitch Client');

    setTimeout(() => {
      checkLive(client);
    }, 1000 * 5);

    setInterval(() => {
      checkLive(client);
    }, 1000 * 120);
  }

  return {
    start,
  };
};

async function checkLive(client) {
  let results;
  try {
    results = await client.mongo.twitchChannels.find({});
  } catch (err) {
    logger.error(err);
    return;
  }
  logger.debug('Twitch client results:', results.length);
  if (results.length === 0) return;
  // Filter and map only twitch ids that have an available channel to join
  const ids = results.filter(r => {
    for (let i = 0; i < r.channels.length; i++) {
      const channel = client.channels.get(r.channels[i].channel_id);
      if (channel) return true;
    }
    return false;
  }).map(r => r.twitch_id);
  logger.debug('Twitch ids with available channels:', ids.length);
  client.twitch.count.users = ids.length;
  client.twitch.count.channels = results.filter(r => ids.indexOf(r.twitch_id) !== -1)
    .reduce((a, b) => {
      const channels = b.channels.map(c => client.channels.get(c.channel_id)).filter(x => x);
      return a + channels.length;
    }, 0);
  const idsArray = [];
  while (ids.length > 1) {
    idsArray.push(ids.splice(0, 1));
  }
  idsArray.push(ids);
  const promiseArray = idsArray.map(i => {
    const uri = `https://api.twitch.tv/kraken/streams?channel=${i.join(',')}` +
      `&stream_type=live&client_id=${config.twitch.client_id}&api_version=5`;
    logger.debug(uri);
    return utils.requestJSON(uri);
  });
  Promise.all(promiseArray)
    .then(promiseResults => {
      // Empty waiting queue
      client.twitch.waiting = [];
      // Reduce to an array of twitch stream objects
      const merged = [].concat(...promiseResults)
        .reduce((a, b) => a.concat(...b.streams), []);
      logger.debug(JSON.stringify(merged, null, 2));
      // Save state on first connect then check differences every time after
      if (lastState) {
        merged.forEach(stream => {
          const id = stream.channel._id;
          const mongoData = results.find(x => x.twitch_id === id);
          const inLastState = lastState.find(x => x.channel._id === id);
          if (inLastState) {
            const lastGame = inLastState.game;
            if (lastGame !== stream.game) {
              postChange(client, mongoData, stream, lastGame);
            }
          } else {
            postStart(client, mongoData, stream);
          }
        });
      }
      lastState = merged;
    }).catch(logger.error);
}

function postStart(client, mongoData, stream) {
  /* // Resolve all channels
   logger.debug(`Attempting to post stream start to ${mongoData.channels.length} channel(s)`);
   const name = twitchData.channel.display_name || twitchData.channel.name;
   const str = `:movie_camera: **${name}** just started streaming **${game(twitchData.game)}**` +
   `\n<${twitchData.channel.url}>`;
   mongoData.channels.map(c => client.channels.get(c.channel_id))
   .filter(c => c)
   .forEach(c => {
   c.sendMessage(str).catch(logger.error);
   });*/
}

function postChange(client, mongoData, stream, oldGame) {
  /* logger.debug(`Attempting to post game change to ${mongoData.channels.length} channel(s)`);
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
   }*/
}
