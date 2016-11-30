'use strict';
const logger = require('winston');
const SpotifyApi = require('spotify-web-api-node');
const config = require('../config');
const TokenProvider = require('refresh-token');
const fs = require('fs');
const path = require('path');
const LastFmNode = require('lastfm').LastFmNode;
const request = require('request');

// Set spotify app credentials
const spotifyApi = new SpotifyApi({
  clientId: config.spotify.clientId,
  clientSecret: config.spotify.clientSecret,
  redirectUri: config.spotify.redirectUri,
});

// Load refresh token if we have one saved
let refreshToken = null;
const refreshTokenPath = path.join(__dirname, '../spotify');
if (fs.existsSync(refreshTokenPath)) {
  refreshToken = fs.readFileSync(refreshTokenPath, { encoding: 'utf8' });
}

// Set token refresh details
const tokenProvider = new TokenProvider('https://accounts.spotify.com/api/token', {
  refresh_token: refreshToken,
  client_id: config.spotify.clientId,
  client_secret: config.spotify.clientSecret,
});

// Set lastFM credentials
const lastfm = new LastFmNode({
  api_key: config.lastFM.key,
  secret: config.lastFM.secret,
});

// Set nowPlaying as null
// This is our holder for the current track being played and is compared to new requests
// If it is different we know a new track is playing
let nowPlaying = null;

module.exports = function Spotify() {
  // Function to start the polling of the lastFM api
  function start() {
    logger.info('Starting Spotify/LastFM Client');
    // Run it on start
    checkRecentPlaying();
    // Run every 15 seconds
    setInterval(() => {
      checkRecentPlaying();
    }, 1000 * 15);
  }

  // Search for a track by name, returns 5 results
  function search(query) {
    return new Promise((resolve, reject) => {
      logger.debug('Searching Spotify by track name', query);
      spotifyApi.searchTracks(query, { limit: 5, type: 'track', market: 'us' })
        .then(data => {
          resolve(data.body.tracks.items);
        }).catch(reject);
    });
  }

  // Get the auth uri for the scopes we need
  function getAuthUri() {
    logger.debug('getAuthUri');
    return spotifyApi.createAuthorizeURL(['playlist-modify-private'], null);
  }

  // Set tokens from the auth code provided
  function setAuthCode(code) {
    return new Promise((resolve, reject) => {
      spotifyApi.authorizationCodeGrant(code)
        .then(data => {
          // Save new auth to spotify
          spotifyApi.setAccessToken(data.body.access_token);
          // Save new auth to token refresher
          tokenProvider.refresh_token = data.body.refresh_token;
          // Save refresh token to local cache for future bot starts
          fs.writeFile(refreshTokenPath, data.body.refresh_token, 'utf8', err => {
            if (err) {
              logger.error('Error saving spotify refresh token to file', err);
            }
          });
          resolve();
        }).catch(reject);
    });
  }

  // Resolve a spotify track by id
  function resolveId(id) {
    return new Promise((resolve, reject) => {
      spotifyApi.getTrack(id)
        .then(data => {
          if (data.available_markets && data.available_markets.indexOf('US') === -1) {
            reject({ discordReply: 'That spotify track is not available in the US.' });
          }
          resolve(data.body);
        })
        .catch(err => {
          err.discordReply = 'That is not a valid Spotify Track ID';
          reject(err);
        });
    });
  }

  function addTrack(track) {
    return new Promise((resolve, reject) => {
      logger.debug('Adding track to playlist:', track.uri);
      // Make sure we are authenticated and have a good access token
      authenticate()
        .then(user => {
          // Add track to playlist
          spotifyApi.addTracksToPlaylist(user.id, config.spotify.playlistID, track.uri)
            .then(() => {
              resolve(track);
            })
            .catch(err => {
              err.discordReply = `There was an error adding ` +
                `**${track.name} - ${track.artists[0].name}** to the playlist.`;
              reject(err);
            });
        }).catch(reject);
    });
  }

  function removeTrack(track) {
    return new Promise((resolve, reject) => {
      logger.debug('Removing tracks from playlist');
      // Search spotify for any track matches, return 5 max
      search(track)
        .then(results => {
          const uris = results.map(i => {
            return { uri: i.uri };
          });
          if (!uris || uris.length === 0) {
            reject('No items found');
            return;
          }
          // Authenticate to spotify
          authenticate()
            .then(body => {
              const tracks = { tracks: uris };
              request.delete({
                url: `https://api.spotify.com/v1/users/${body.id}/playlists/${config.spotify.playlistID}/tracks`,
                headers: {
                  Authorization: `Bearer ${spotifyApi.getAccessToken()}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify(tracks),
              }, (err, res) => {
                if (err || res.statusCode !== 200) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            }).catch(reject);
        })
        .catch(reject);
    });
  }

  function checkRecentPlaying() {
    const req = lastfm.request('user.getRecentTracks', { user: config.lastFM.username, limit: 1 });
    req.on('error', logger.error);
    req.on('success', data => {
      let track = data.recenttracks.track;
      if (track instanceof Array) {
        track = track[0];
      }
      track = `${track.name} - ${track.artist['#text']}`;
      if (!nowPlaying) {
        logger.debug('Saving first track', track);
        nowPlaying = track;
        return;
      }
      if (track !== nowPlaying) {
        // The track has changed and we should remove the old track from the spotify playlist
        logger.debug('Spotify track has changed');
        removeTrack(nowPlaying)
          .then(() => {
            logger.debug('Successful removal of a spotify track from the playlist');
          })
          .catch(err => {
            logger.debug('Error removing a spotify track from the playlist', nowPlaying, err);
          });
        // Store latest track
        nowPlaying = track;
      }
    });
  }

  function authenticate() {
    return new Promise((resolve, reject) => {
      tokenProvider.getToken((err, accessToken) => {
        if (err) {
          reject(err);
        } else {
          spotifyApi.setAccessToken(accessToken);
          spotifyApi.getMe()
            .then(data => {
              resolve(data.body);
            }).catch(reject);
        }
      });
    });
  }

  return {
    start,
    search,
    getAuthUri,
    setAuthCode,
    resolveId,
    addTrack,
    authenticate,
  };
};
