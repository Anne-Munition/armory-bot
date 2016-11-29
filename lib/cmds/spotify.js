'use strict';
exports.info = {
  desc: 'Add a song to a Spotify playlist to share with AnneMunition.',
  usage: '',
  aliases: [],
};

const logger = require('winston');
const spotify = require('../spotify')();
const spotifyId = /([a-zA-Z0-9]{22})/;
const config = require('../../config');

exports.run = (client, msg, params = []) => {
  // Only allowed in DMs or Armory Server
  const guildId = '140025699867164673';
  if (msg.channel.type !== 'dm' && msg.guild.id !== guildId) {
    const guild = client.guilds.get(guildId);
    msg.reply(`This command only works in the ${guild.name} Discord server and in DMs.`);
    return;
  }
  // Show usage if no params were passed
  if (params.length === 0) {
    msg.reply('Please enter a song name, spotify url or spotify id.\n' +
      `\`\`${msg.prefix}spotify <name | url | id>\`\``);
    return;
  }

  // Method for user to get auth url and enter auth code
  if (params[0].toLowerCase() === 'auth') {
    // Get auth uri
    const uri = spotify.getAuthUri();
    // Construct string to send to Discord
    const str = `Please follow the link below and copy/paste the displayed code into this chat.\n` +
      `We will wait for 3 minutes for the code to be entered.\n\n<${uri}>\n\n` +
      `:exclamation: DO NOT POST THE CODE PUBLICLY - ONLY HERE :exclamation:`;
    // Send instructions to DM
    msg.author.sendMessage(str)
      .then(m => {
        // Create a message collector
        const collector = m.channel.createCollector(
          // Catches all messages
          () => true,
          {
            // Only match the first message
            maxMatches: 1,
            // Wait 3 minutes for 1 message
            time: 1000 * 60 * 3,
          });
        // Called on timeout or message count
        collector.on('end', (collected, reason) => {
          if (reason === 'time') {
            msg.author.sendMessage('Time is up.');
            return;
          }
          if (reason === 'matchesLimit') {
            // Get the code from the 1, only collected message
            const code = collected.first().content;
            // Set auth code
            spotify.setAuthCode(code)
              .then(() => {
                // Spotify tokens set successfully
                msg.author.sendMessage(':thumbsup: Thanks! That worked. ' +
                  'Members should now be able to add tracks to the playlist.');
              })
              .catch(err => {
                // Spotify tokens not set
                logger.error(err);
                msg.author.sendMessage(':thumbsdown: That code did not work to generate an access_token.' +
                  '\nPlease try again.');
              });
          }
        });
      })
      .catch(logger.error);
    return;
  }

  // Join params to search tracks with spaces
  params = params.join(' ');
  let id = null;
  // Attempt to pull spotify track from submitted string
  // Works for full urls and stand alone ids
  const match = params.match(spotifyId);
  if (match && match[1]) {
    id = match[1];
  }

  getID(msg, id, params)
    .then(spotify.resolveId)
    .then(track => checkDB(client, track))
    .then(track => spotify.addTrack(track))
    .then(track => {
      msg.reply(`:notes: '**${track.name}** - ${track.artists[0].name}' has been added to Anne's Spotify playlist.`);
    })
    .catch(err => {
      // Reply if was passed along a specific response to Discord
      if (err && err.discordReply) {
        msg.reply(err.discordReply);
      } else {
        msg.reply('There was an Error.');
      }
      // Log error
      if (err) {
        logger.error(err);
      }
    });
};

function getID(msg, id, query) {
  return new Promise((resolve, reject) => {
    // If we already have the ID, resolve it, or try and search with track name and resolve that
    if (id) {
      resolve(id);
      return;
    }
    // Search spotify tracks, only return 5 results
    spotify.search(query)
      .then(tracks => {
        if (tracks.length === 0) {
          // No matches found
          reject({ discordReply: `There were no matches found for **${query}**` });
        } else if (tracks.length === 1) {
          // Only 1 match found, use it
          resolve(tracks[0].uri.replace('spotify:track:', ''));
        } else {
          // Multiple matches, ask the user which one they want to add
          let str = `Multiple matches found for **${query}**\nPlease select a number within 20 seconds...\n`;
          let count = 0;
          tracks.forEach(t => {
            count++;
            str += `\n\`\`${count}.\`\` **${t.name}** - ${t.artists[0].name} - Pop: ${t.popularity}`;
          });
          // Send the list selection
          msg.channel.sendMessage(str)
            .then(matchMessage => {
              // Create message collector
              const collector = msg.channel.createCollector(
                // Must match original message author and be a number
                m => m.author.id === msg.author.id && !isNaN(parseInt(m.content)),
                {
                  time: 20000,
                  maxMatches: 1,
                });
              collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                  matchMessage.delete();
                  reject({ discordReply: 'You took to long to reply.' });
                  return;
                }
                if (reason === 'matchesLimit') {
                  const num = parseInt(collected.first().content);
                  if (num < 1 || num > tracks.size) {
                    reject({ discordReply: 'The number you entered is out of range.' });
                    return;
                  }
                  matchMessage.delete();
                  collected.first().delete();
                  resolve(tracks.map(t => t.uri.replace('spotify:track:', ''))[num - 1]);
                }
              });
            })
            .catch(reject);
        }
      })
      .catch(err => {
        logger.error(err);
        msg.reply(`There was an error searching for track **${query}**.\nPlease try again.`);
      });
  });
}

function checkDB(client, track) {
  return new Promise((resolve, reject) => {
    client.mongo.spotifyTracks.findOne({ track: track.uri })
      .then(result => {
        if (result) {
          if (result.count >= config.spotify.max_count) {
            reject({
              discordReply: `This track has been submitted over ` +
              `${config.spotify.max_count} times previously. Sorry.`,
            });
            return;
          } else {
            result.count++;
          }
        } else {
          result = client.mongo.spotifyTracks({
            uri: track.uri,
            count: 1,
            track: `${track.name} - ${track.artists[0].name}`,
          });
        }
        result.save()
          .then(() => {
            resolve(track);
          })
          .catch(reject);
      })
      .catch(reject);
  });
}
