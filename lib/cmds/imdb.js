'use strict';
exports.info = {
  name: 'imdb',
  desc: 'Get data about a movie',
  usage: 'imdb <movie>',
};

const fetch = require('node-fetch');
const imdb = require('imdb');
const logger = require('winston');

exports.run = (discord, msg, params = []) => {
  // Exit if no params were passed
  if (params.length === 0) {
    return;
  }
  msg.channel.sendMessage('Searching...')
    .then(m => {
      const uri = encodeURI(`http://www.omdbapi.com/?t=${params.join(' ')}&r=json`);
      fetch(uri)
        .then(r => r.json())
        .then(body => {
          if (body.Error) {
            m.edit(`No results found for: ${params.join(' ')}`);
            return;
          }
          const id = body.imdbID;
          if (!id) {
            m.edit('Unable to get imdbID from search results.');
          }
          imdb(id, (err, data) => {
            if (err) {
              m.edit('Unable to get data from imdb.');
            } else {
              let str = '```apache\n';
              str += `Title: ${data.title}\n`;
              str += `Year: ${data.year}\n`;
              str += `Rating: ${data.contentRating}\n`;
              str += `Runtime: ${data.runtime}\n`;
              str += `Rating: ${data.rating}\n`;
              str += `Genre: ${data.genre.join(', ')}\n`;
              str += `Director: ${data.director}\n`;
              str += `Writer: ${data.writer}\n\n`;
              str += `Description: '${data.description}'\n`;
              if (!data.poster || data.poster === 'N/A') {
                str += '\nIMAGE NOT AVAILABLE';
              }
              str += '```';
              m.delete();
              if (!data.poster || data.poster === 'N/A') {
                msg.channel.sendMessage(str);
              } else {
                msg.channel.sendFile(data.poster, `${data.title}.jpg`, str);
              }
            }
          });
        })
        .catch(() => {
          m.edit(`No results found for: ${params.join(' ')}`);
        });
    })
    .catch(logger.error);
};
