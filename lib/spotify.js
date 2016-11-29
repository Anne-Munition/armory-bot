'use strict';
const logger = require('winston');
const SpotifyApi = require('spotify-web-api-node');
const config = require('../config');
const TokenProvider = require('refresh-token');
const fs = require('fs');
const path = require('path');

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

module.exports = function Spotify() {
  // Search for a track by name, return 5 results
  function search(query) {
    return new Promise((resolve, reject) => {
      logger.debug('Searching Spotify by track name', query);
      spotifyApi.searchTracks(query, { limit: 5, type: 'track' })
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
      logger.debug('setAuthCode');
      spotifyApi.authorizationCodeGrant(code)
        .then(data => {
          // Save new auth to spotify
          spotifyApi.setAccessToken(data.body.access_token);
          spotifyApi.setRefreshToken(data.body.refresh_token);
          // Save new auth to token refresher
          tokenProvider.refresh_token = data.body.refresh_token;
          // Save refresh token for future bot reloads
          fs.writeFile(refreshTokenPath, data.body.refresh_token, 'utf8', err => {
            if (err) {
              logger.error(err);
            }
          });
          resolve();
        }).catch(reject);
    });
  }

  // Resolve a spotify track by id
  function resolveId(id) {
    return new Promise((resolve, reject) => {
      logger.debug('Searching Spotify for track id:', id);
      spotifyApi.getTrack(id)
        .then(data => {
          resolve(data.body);
        })
        .catch(err => {
          err.discordReply = 'That is not a valid Spotify Track ID';
          reject(err);
        });
    });
  }

  function addTrack(client, track) {
    return new Promise((resolve, reject) => {
      // Get the access_token or refresh it
      logger.debug('Adding track to playlist:', track.id);
      tokenProvider.getToken((err, accessToken) => {
        if (err) {
          logger.debug('Spotify access_token NOT ok');
          reject(err);
        } else {
          logger.debug('Spotify access_token ok');
          // Save the most recent token to spotify
          spotifyApi.setAccessToken(accessToken);
          // Ensure token is valid
          spotifyApi.getMe()
            .then(data => {
              logger.debug('Spotify got me ok');
              // Token is valid, add track
              spotifyApi.addTracksToPlaylist(data.body.id, config.spotify.playlistID, track.uri)
                .then(() => {
                  resolve(track);
                })
                .catch(e => {
                  e.discordReply = 'We were unable to add that track to the playlist.';
                  reject(err);
                });
            })
            .catch(e => {
              logger.debug('Spotify got me NOT ok');
              // The token was not valid.
              e.discordReply = `Authentication error. Unable to add the track to Anne's playlist.`;
              const owner = client.users.get(config.owner_id);
              if (owner) {
                owner.sendMessage('Spotify Authentication Error.');
              }
              reject(err);
            });
        }
      });
    });
  }

  return {
    search,
    getAuthUri,
    setAuthCode,
    resolveId,
    addTrack,
  };
};
