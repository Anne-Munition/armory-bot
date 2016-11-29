'use strict';
const logger = require('winston');
const SpotifyApi = require('spotify-web-api-node');
const config = require('../config');
const TokenProvider = require('refresh-token');
const fs = require('fs');
const path = require('path');
const LastFmNode = require('lastfm').LastFmNode;
const request = require('request');


logger.info('Loading spotify functionality.');

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

const lastfm = new LastFmNode({
  api_key: config.lastFM.key,
  secret: config.lastFM.secret,
});

let nowPlaying = null;

module.exports = function Spotify() {
  function start(client) {
    setInterval(() => {
      checkRecentPlaying(client);
    }, 1000 * 15);
    checkRecentPlaying(client);
  }

  // Search for a track by name, return 5 results
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
          if (data.available_markets && data.available_markets.indexOf('US') === -1) {
            reject({ discordReply: 'That track is not available in the US.' });
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
      // Get the access_token or refresh it
      logger.debug('Adding track to playlist:', track.uri);
      authenticate()
        .then(body => {
          spotifyApi.addTracksToPlaylist(body.id, config.spotify.playlistID, track.uri)
            .then(() => {
              resolve(track);
            })
            .catch(err => {
              err.discordReply = 'We were unable to add that track to the playlist.';
              reject(err);
            });
        })
        .catch(reject);
    });
  }

  function removeTrack(client, track) {
    logger.debug('removing', track, 'from spotify playlist');
    search(track)
      .then(rTracks => {
        if (!rTracks || rTracks.length === 0) {
          return;
        }
        logger.debug('Removing tracks from playlist');
        authenticate()
          .then(body => {
            logger.debug('Auth OK');
            client.mongo.spotifyTracks.findOne({ track })
              .then(result => {
                if (result) {
                  const tracks = { tracks: [{ uri: result.uri }] };
                  request.delete({
                    url: `https://api.spotify.com/v1/users/${body.id}/playlists/${config.spotify.playlistID}/tracks`,
                    headers: {
                      Authorization: `Bearer ${spotifyApi.getAccessToken()}`,
                      'content-type': 'application/json',
                    },
                    body: JSON.stringify(tracks),
                  }, (err, res, results) => {
                    if (err) {
                      logger.error(err);
                    } else {
                      logger.debug(res.statusCode, results);
                    }
                  });
                }
              })
              .catch(logger.error);
          })
          .catch(logger.error);
      })
      .catch(logger.error);
  }

  function checkRecentPlaying(client) {
    const req = lastfm.request('user.getRecentTracks', { user: 'DBKynd', limit: 1 });
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
        logger.debug('Track has changed');
        removeTrack(client, nowPlaying);
        nowPlaying = track;
      }
    });
  }

  function authenticate() {
    return new Promise((resolve, reject) => {
      tokenProvider.getToken((err, accessToken) => {
        if (err) {
          reject(err);
          return;
        }
        logger.debug('Spotify access_token ok');
        // Save the most recent token to spotify
        spotifyApi.setAccessToken(accessToken);
        // Ensure token is valid
        spotifyApi.getMe()
          .then(data => {
            logger.debug('Spotify got me ok');
            resolve(data.body);
          })
          .catch(reject);
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
  };
};
