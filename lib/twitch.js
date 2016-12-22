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
    utils.ownerError(client, err);
    return;
  }
  if (results.length === 0) return;
  // Filter and map only twitch ids that have an available channel to join
  const ids = results.filter(r => {
    for (let i = 0; i < r.channels.length; i++) {
      const channel = client.channels.get(r.channels[i].channel_id);
      if (channel) return true;
    }
    return false;
  }).map(r => r.twitch_id);
  client.twitch.count.users = ids.length;
  client.twitch.count.channels = results.filter(r => ids.indexOf(r.twitch_id) !== -1)
    .reduce((a, b) => {
      const channels = b.channels.map(c => client.channels.get(c.channel_id)).filter(x => x);
      return a + channels.length;
    }, 0);
  const idsArray = [];
  while (ids.length > 100) {
    idsArray.push(ids.splice(0, 100));
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
      // Save state on first connect then check differences every time after
      if (lastState) {
        merged.forEach(stream => {
          const id = stream.channel._id.toString();
          const mongoData = results.find(x => x.twitch_id === id);
          if (!mongoData) return;
          const inLastState = lastState.find(x => x.channel._id.toString() === id);
          if (inLastState) {
            const lastGame = inLastState.game;
            if (lastGame !== stream.game) {
              post(client, mongoData, stream, lastGame);
            }
          } else {
            post(client, mongoData, stream);
          }
        });
      }
      lastState = merged;
    })
    .catch(err => {
      utils.ownerError(client, err);
    });
}

async function post(client, mongoData, stream, oldGame) {
  const name = utils.twitchDisplayName(stream.channel.name, stream.channel.display_name);
  const logo = stream.channel.logo || 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png';
  const embed = {
    color: await utils.palette(logo),
    thumbnail: {
      url: logo,
    },
    fields: [
      { name: 'Twitch Channel:', value: `[${name}](${stream.channel.url})`, inline: true },
      { name: 'Status:', value: oldGame ? 'Changed Games' : 'Started Streaming', inline: true },
    ],
  };
  if (oldGame) {
    embed.fields.push({ name: 'New Game:', value: game(stream.game), inline: true });
    embed.fields.push({ name: 'Old Game:', value: game(oldGame), inline: true });
  } else {
    embed.fields.push({ name: 'Game:', value: game(stream.game), inline: false });
  }
  if (stream.channel.status) {
    embed.fields.push({ name: 'Title:', value: stream.channel.status, inline: false });
  }
  mongoData.channels.map(c => client.channels.get(c.channel_id))
    .filter(c => c)
    .forEach(c => c.sendMessage('', { embed })
      .catch(err => {
        utils.ownerError(client, err);
      }));
}

function game(g) {
  if (g === '') {
    return '__NONE__';
  } else {
    return g;
  }
}
