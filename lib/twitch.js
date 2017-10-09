'use strict';
const logger = require('winston');
const config = require('../config');
const request = require('snekfetch');

logger.debug('Loading TwitchLive Module');

let lastState = null;
const requiredPerms = ['SEND_MESSAGES', 'EMBED_LINKS'];

module.exports = function TwitchLive(client) {
  function start() {
    // Start the timers that check the twitch status of the subscribed channels
    logger.info('Starting Twitch Client');

    // Run 5 seconds after startup
    setTimeout(() => {
      checkLive(client);
    }, 1000 * 5);

    // Run every 2 minutes
    setInterval(() => {
      checkLive(client);
    }, 1000 * 120);

    // Check and update any changes in display_names 15 seconds after launch
    setTimeout(() => {
      updateDisplayNames(client);
    }, 1000 * 15);

    // Check and update any changes in display_names every 30 minutes
    setInterval(() => {
      updateDisplayNames(client);
    }, 1000 * 60 * 30);
  }

  // Return the twitch id's user logo or the twitch default one
  async function getUserLogo(id) {
    const user = await getUserData(id);
    return user.profile_image_url || 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png';
  }

  // Get user info from twitch api via login name or id
  function getUserData(loginOrId) {
    return new Promise((resolve, reject) => {
      const query = {};
      // If all digits we can assume id
      if (/^\d+$/.test(loginOrId)) {
        query.id = loginOrId;
      } else {
        query.login = loginOrId;
      }
      // Query the Twitch API
      request.get(client.utils.buildUri('https://api.twitch.tv/helix/users', query))
        .set({ 'Client-ID': config.twitch.client_id })
        .then(response => {
          resolve(client.utils.get(['body', 'data', 0], response));
        })
        .catch(reject);
    });
  }

  // Exported functions
  return {
    start,
    getUserLogo,
    displayName,
    getUserData,
  };
};

// Check stream status of registered channels and post in respective Discord channels when the status changes
async function checkLive(client) {
  client.logger.debug('twitchClient checkLive');
  // Get the list of channels from the db
  const results = await client.mongo.twitchChannels.find({});
  // Error if issue getting data
  if (!results) {
    client.utils.ownerError('Twitch Client', client, 'Error getting Twitch channel results from DB');
    return;
  }
  // Return if there are no twitch streams to check on
  if (results.length === 0) {
    lastState = [];
    return;
  }
  // Filter and map only twitch ids that have an available Discord channel to with allowed permissions
  const ids = results.filter(r => {
    for (let i = 0; i < r.channels.length; i++) {
      const channel = client.channels.get(r.channels[i].channel_id);
      if (channel) {
        const perms = channel.permissionsFor(client.user).has(requiredPerms);
        if (perms) return true;
      }
    }
    return false;
  }).map(r => r.twitch_id);
  // Store the number of good ids for the stats command
  client.twitch.users = ids.length;
  // Store the number of good channels we have perms in; For the stats command
  client.twitch.channels = results.filter(r => ids.indexOf(r.twitch_id) !== -1)
    .reduce((a, b) => {
      const channels = b.channels.map(c => client.channels.get(c.channel_id)).filter(c => c &&
        c.permissionsFor(client.user).has(requiredPerms));
      return a + channels.length;
    }, 0);
  // Split the twitch ids into 100 max length chunk arrays
  // Twitch will only allow look ups of 100 streams per call
  const idsArray = [];
  while (ids.length > 100) {
    idsArray.push(ids.splice(0, 100));
  }
  // Push the last, < 100 array
  idsArray.push(ids);
  // Create a promise array to fetch all stream statuses from Twitch
  const promiseArray = idsArray.map(i => {
    const uri = `https://api.twitch.tv/helix/streams?type=live${i.map(id => `&user_id=${id}`).join('')}`;
    logger.debug(uri);
    return request.get(uri).set({ 'Client-ID': config.twitch.client_id });
  });
  // Resolve all Twitch api fetch promises
  Promise.all(promiseArray)
    .then(twitchResponses => {
      // Clear all waiting twitch channels
      client.twitch.waiting = [];
      // Extract the data we are interested in from the twitch responses or an empty array
      const twitchResults = twitchResponses.map(r => client.utils.get(['body', 'data'], r) || []);
      // Reduce to a single array of twitch stream objects
      const mergedResults = twitchResults.reduce((a, b) => a.concat(...b), []);
      // Save state on first connect then check differences every time after
      if (lastState) {
        mergedResults.forEach(stream => {
          const inLastState = lastState.find(x => x.id === stream.id);
          if (inLastState) {
            // Stream was live on last api check
            // See if the game has changed
            const lastGame = inLastState.game_id;
            if (lastGame !== stream.game_id) {
              // Post game change
              client.logger.debug('Twitch Client Post - Game change');
              post(client, results, stream, lastGame);
            }
          } else {
            // The stream is new on this api check
            // Post new live stream
            client.logger.debug('Twitch Client Post - Stream start');
            post(client, results, stream);
          }
        });
      }
      // Store state for next api check
      lastState = mergedResults;
    })
    .catch(err => {
      logger.debug('Twitch Client Error', err);
      client.utils.ownerError('Twitch Client - checkLive', client, err);
    });
}

async function post(client, results, stream, oldGame) {
  // Increment the counter for how many twitch stream changes we have posted
  client.count.twitch++;
  // Get the data for this twitch id out of the mongo results
  const mongoData = results.find(x => x.twitch_id === stream.user_id);
  // There should always be mongoData if we have gotten this far but...
  if (!mongoData) return;
  const logo = mongoData.image_url || 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png';
  const embed = new client.Discord.MessageEmbed()
    .setColor(await client.utils.palette(logo))
    .setThumbnail(logo)
    .addField('Twitch Channel:', `[${mongoData.display_name}](https://www.twitch.tv/${mongoData.login})`, true)
    .addField('Status:', oldGame ? 'Changed Games' : 'Started Streaming', true)
    .setTimestamp();
  if (oldGame) {
    embed.addField('New Game:', await getGameName(client, stream.game_id), true)
      .addField('Old Game:', await getGameName(client, oldGame), true);
  } else {
    embed.addField('Game:', await getGameName(stream.game_id));
  }
  if (stream.title) embed.addField('Title:', stream.title);
  mongoData.channels
    // Resolve channels from the Discord Cache
    .map(c => client.channels.get(c.channel_id))
    // Filter out any null channels that did not resolve
    // Filter out channels we do not have permissions in
    .filter(c => c && c.permissionsFor(client.user).has(requiredPerms))
    //  Loop through the channels left
    .forEach(c => {
      // Make sure the guild is available. It should be if we were able to resolve the channel I think
      if (!c.guild.available) return;
      c.send({ embed })
        .catch(err => {
          client.utils.ownerError(`Twitch Client - Send to Channel (${c.id}) `, client, err);
        });
    });
}

function getGameName(client, id) {
  return new Promise((resolve, reject) => {
    resolve('GAME NAME HERE');
    const uri = client.utils.buildUri(`http://www.giantbomb.com/api/game/${id}/`, {
      api_key: client.config.giantBomb.apiKey,
    });
    request.get(uri)
      .then(response => {
        console.log(response.body);
        return client.utils.get(['body'], response);
      })
      .catch(err => {
        client.logger.error(err);
        return resolve('');
      });
  });
}

async function updateDisplayNames(client) {
  client.logger.debug('twitchClient updateDisplayNames');
  // Only poll the api every 30 minutes vs on every post for stream changes
  // Get all the records from the mongo db
  const results = await client.mongo.twitchChannels.find({});
  // Exit if we cannot get the records or if there aren't any yet available to edit
  if (!results || results.length === 0) return;
  // Get an array of all twitch ids
  const ids = results.map(r => r.twitch_id);
  // Split the twitch ids into 100 max length chunk arrays
  // Twitch will only allow look ups of 100 streams per call
  const idsArray = [];
  while (ids.length > 100) {
    idsArray.push(ids.splice(0, 100));
  }
  // Push the last, < 100 array
  idsArray.push(ids);
  // Create a promise array to fetch the display_names from Twitch
  const promiseArray = idsArray.map(i => {
    const uri = `https://api.twitch.tv/helix/users?id=${i.shift()}${i.map(id => `&id=${id}`).join('')}`;
    logger.debug(uri);
    return request.get(uri).set({ 'Client-ID': config.twitch.client_id });
  });
  Promise.all(promiseArray)
    .then(twitchResponses => {
      // Clear all waiting twitch channels
      client.twitch.waiting = [];
      // Extract the data we are interested in from the twitch responses or an empty array
      const twitchResults = twitchResponses.map(r => client.utils.get(['body', 'data'], r) || []);
      // Reduce to a single array of twitch stream objects
      const mergedResults = twitchResults.reduce((a, b) => a.concat(...b), []);
      // Loop through all the mongo results
      results.forEach(result => {
        // Get the matching twitch results
        const twitch = mergedResults.find(x => x.id === result.twitch_id);
        if (!twitch) return;
        // Save record if data is different from twitch
        // display_name or profile_image_url or login
        if (result.display_name !== displayName(twitch) || result.login !== twitch.login ||
          result.image_url !== twitch.profile_image_url) {
          result.display_name = displayName(twitch);
          result.image_url = twitch.profile_image_url;
          result.login = twitch.login;
          result.save().catch(client.logger.error);
        }
      });
    })
    .catch(err => {
      client.utils.ownerError('Twitch Client - updateDisplayNames', client, err);
    });
}

// Determine localized display name
function displayName(user) {
  // Only use the login name if it does not match the display_name case-insensitive
  // as this meant the chars in one are usually in a different language
  if (user.login.toLowerCase() !== user.display_name.toLowerCase()) {
    return user.login;
  } else {
    // Use the display_name unless they never set one in their settings page
    return user.display_name || user.login;
  }
}
