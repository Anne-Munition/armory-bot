'use strict';
const logger = require('winston');
const config = require('../config');
const utils = require('./utilities');
const request = require('request');

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
    utils.ownerError('Twitch Client', client, err);
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
    return requestJSON(uri);
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
      logger.debug('Twitch Client Error', err);
      utils.ownerError('Twitch Client', client, err);
    });
}

async function post(client, mongoData, stream, oldGame) {
  client.count.twitch++;
  const name = utils.twitchDisplayName(stream.channel.name, stream.channel.display_name);
  const logo = stream.channel.logo || 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png';
  const embed = new client.Discord.RichEmbed()
    .setColor(await utils.palette(logo))
    .setThumbnail(logo)
    .addField('Twitch Channel:', `[${name}](${stream.channel.url})`, true)
    .addField('Status:', oldGame ? 'Changed Games' : 'Started Streaming', true);
  if (oldGame) {
    embed.addField('New Game:', game(stream.game), true)
      .addField('Old Game:', game(oldGame), true);
  } else {
    embed.addField('Game:', game(stream.game));
  }
  if (stream.channel.status) {
    embed.addField('Title:', stream.channel.status);
  }
  mongoData.channels.map(c => client.channels.get(c.channel_id))
    .filter(c => c)
    .forEach(c => {
      if (!c.guild.available) return;
      if (!c.permissionsFor(client.user).hasPermission('SEND_MESSAGES')) {
        client.logger.error(`Not allowed to post messages in guild **${c.guild.name}** channel **${c.name}** ` +
          `owned by **${c.guild.owner.user.username}**`);
        return;
      }
      c.send({ embed })
        .catch(err => {
          utils.ownerError('Twitch Client', client, err);
        });
    });
}

function game(g) {
  if (g === '') {
    return '__NONE__';
  } else {
    return g;
  }
}

function requestJSON(uri) {
  return new Promise((resolve, reject) => {
    request.get({
      url: encodeURI(uri),
      json: true,
    }, (err, res, body) => {
      if (err) return reject(err);
      if (res.statusCode === 200 && body.error) return reject(body.error);
      if (res.statusCode !== 200) return reject(res.statusCode);
      return resolve(body);
    });
  });
}
