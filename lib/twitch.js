'use strict';
const logger = require('winston');
const config = require('../config');
const request = require('snekfetch');
const debug = require('debug')('twitchClient');

debug('Loading TwitchLive Module');

let lastState = null;
const games = new Map(); // eslint-disable-line no-undef
const requiredPerms = ['SEND_MESSAGES', 'EMBED_LINKS'];
let errors = {};

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
      updateUserData(client);
    }, 1000 * 15);

    // Check and update any changes in display_names every 60 minutes
    setInterval(() => {
      updateUserData(client);
    }, 1000 * 60 * 60);
  }

  // Return the twitch id's user logo or the twitch default one
  async function getUserLogo(id) {
    const user = await getUserData(id);
    return user ? user.profile_image_url : 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png';
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
  debug('twitchClient checkLive');
  // Get an up to date list of registered channels from the db
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
  // Filter and map out only twitch ids that have an available Discord channel with allowed send permissions
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
  // Store the number of filtered ids for the stats command
  client.twitch.users = ids.length;
  // Store the number of registered channels we have send perms in for the stats command
  client.twitch.channels = results.filter(r => ids.indexOf(r.twitch_id) !== -1)
    .reduce((a, b) => {
      const channels = b.channels.map(c => client.channels.get(c.channel_id)).filter(c => c &&
        c.permissionsFor(client.user).has(requiredPerms));
      return a + channels.length;
    }, 0);
  // Don't continue if we don't have any channels to send to
  if (client.twitch.channels === 0) {
    debug('No available channels to send twitch streams posts to');
    return;
  }
  // Split the filtered ids into 100 max length chunk arrays
  // Twitch will only allow look-ups of 100 streams per call
  const idsArray = [];
  while (ids.length > 100) {
    idsArray.push(ids.splice(0, 100));
  }
  // Push the last, < 100 array
  idsArray.push(ids);
  // Create a promise array to fetch all stream statuses from Twitch
  const promiseArray = idsArray.map(i => {
    const uri = `https://api.twitch.tv/helix/streams?type=live${i.map(id => `&user_id=${id}`).join('')}`;
    debug(uri);
    return request.get(uri).set({ 'Client-ID': config.twitch.client_id });
  });
  // Resolve all Twitch api fetch promises
  Promise.all(promiseArray)
    .then(async twitchResponses => {
      // Clear the list of channels that were waiting to be added to the twitch client
      // This is checked when trying to add a new twitch channel to see if it is already queued to be synced
      client.twitch.waiting = [];
      // Clear the errors object as we just got good results
      errors = {};
      // Extract the data we are interested in from the twitch responses or an empty array
      const twitchResults = twitchResponses.map(r => client.utils.get(['body', 'data'], r) || []);
      // Reduce to a single array of twitch stream objects
      const mergedResults = twitchResults.reduce((a, b) => a.concat(...b), []);
      // Save state on first connect then check differences every time after
      if (lastState) {
        const gameIdsThatNeedResolving = [];
        const newStreams = [];
        const gameChanged = [];
        // Determine which streams are new and which have changed games
        mergedResults.forEach(stream => {
          const inLastState = lastState.find(x => x.id === stream.id);
          if (inLastState) {
            // Stream was live on last api check
            // See if the game has changed
            const lastGame = inLastState.game_id;
            if (lastGame !== stream.game_id) {
              gameChanged.push(stream);
            }
          } else {
            // The stream is new on this api check
            // Post new live stream
            newStreams.push(stream);
          }
        });
        // Determine which new streams have games that need resolving
        newStreams.forEach(stream => {
          if (!games.has(stream.game_id) || games.get(stream.game_id).expires < new Date().valueOf()) {
            gameIdsThatNeedResolving.push(stream.game_id);
          }
        });
        // Determine which game changed streams have games that need resolving
        gameChanged.forEach(stream => {
          if (!games.has(stream.game_id) || games.get(stream.game_id).expires < new Date().valueOf()) {
            gameIdsThatNeedResolving.push(stream.game_id);
          }
        });
        // Resolve all the game Ids to game names ans store them in local memory
        await resolveGames(client, gameIdsThatNeedResolving);
        // Inject the game data into the stream objects
        newStreams.forEach(stream => {
          if (games.has(stream.game_id)) {
            stream.game_name = games.get(stream.game_id).name;
            stream.game_art = games.get(stream.game_id).box_art_url;
          }
          post(client, results, stream);
        });
        gameChanged.forEach(stream => {
          if (games.has(stream.game_id)) {
            stream.game_name = games.get(stream.game_id).name;
            stream.game_art = games.get(stream.game_id).box_art_url;
          }
          const last = lastState.find(x => x.id === stream.id);
          if (games.has(last.game_id)) {
            last.game_name = games.get(last.game_id).name;
            last.game_art = games.get(last.game_id).box_art_url;
          }
          post(client, results, stream, last);
        });
      }
      // Store state for next api check
      lastState = mergedResults;
    })
    .catch(err => {
      // There was an error making the streams api calls
      debug('Twitch Client Error', err);
      // Get the status code number
      const statusCode = err.message.split(' ')[0];
      // Check if we already have had this error
      if (errors[statusCode]) {
        // We have had this error before
        // Increment the count of the error
        errors[statusCode].count++;
        // Send a message to the bot owner if we have gotten the same error three times in a row
        if (errors[statusCode].count >= 3) {
          client.utils.ownerError('Twitch Client - checkLive', client, err.message);
          // Clear the errors; Don't message until 3 more errors occur in a row
          errors = {};
        }
      } else {
        // First error of this kind; set the first count
        errors[statusCode] = { count: 1 };
      }
    });
}

// Resolve all the game Ids to game names ans store them in local memory
function resolveGames(client, gameIds) {
  return new Promise((resolve, reject) => {
    if (!gameIds || gameIds.length === 0) {
      resolve();
      return;
    }
    // Split the game ids into 100 max length chunk arrays
    // Twitch will only allow look-ups of 100 streams per call
    const idsArray = [];
    while (gameIds.length > 100) {
      idsArray.push(gameIds.splice(0, 100));
    }
    // Push the last, < 100 array
    idsArray.push(gameIds);
    // Create a promise array to fetch all game data from Twitch
    const promiseArray = idsArray.map(i => {
      const uri = `https://api.twitch.tv/helix/games${i.map(id => `&id=${id}`).join('').replace('&', '?')}`;
      debug(uri);
      return request.get(uri).set({ 'Client-ID': config.twitch.client_id });
    });
    Promise.all(promiseArray)
      .then(twitchResponses => {
        // Extract the data we are interested in from the twitch responses or an empty array
        const twitchResults = twitchResponses.map(r => client.utils.get(['body', 'data'], r) || []);
        // Reduce to a single array of twitch stream objects
        const mergedResults = twitchResults.reduce((a, b) => a.concat(...b), []);
        // Store all the games to our local cache
        mergedResults.forEach(game => {
          game.expires = new Date().valueOf() + (1000 * 60 * 5);
          games.set(game.id, game);
        });
        resolve();
      })
      .catch(reject);
  });
}

async function post(client, results, stream, last) {
  // Increment the counter for how many twitch stream changes we have posted
  client.count.twitch++;
  // Get the data for this twitch id out of the mongo results
  const mongoData = results.find(x => x.twitch_id === stream.user_id);
  // There should always be mongoData if we have gotten this far but...
  if (!mongoData) return;
  const logo = mongoData.image_url || 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png';
  const embed = new client.Discord.RichEmbed()
    .setColor(await client.utils.palette(logo))
    .setThumbnail(logo)
    .addField('Channel:', `[${mongoData.display_name}](https://www.twitch.tv/${mongoData.login})`, true)
    .addField('Status:', last ? 'Changed Games' : 'Started Streaming', true)
    .setFooter('twitch.tv', 'https://www.shareicon.net/data/2016/10/18/844051_media_512x512.png')
    .setTimestamp();
  if (last) {
    embed.addField('New Game:', stream.game_name || stream.game_id || 'NONE', true)
      .addField('Old Game:', last.game_name || last.game_id || 'NONE', true);
  } else {
    embed.addField('Game:', stream.game_name || stream.game_id || 'NONE');
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

async function updateUserData(client) {
  // This is to keep our DB up to date with name, display_name, or avatar changes
  debug('twitchClient updateDisplayNames');
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
    debug(uri);
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
