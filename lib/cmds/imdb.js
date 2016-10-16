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
      msg.channel.startTyping();
      fetch(`http://www.omdbapi.com/?t=${params.join(' ')}&r=json`)
        .then(r => r.json())
        .then(body => {
          const id = body.imdbID;
          if (!id) {
            m.edit('Unable to get imdbID from search query.');
          }
          imdb(id, (err, data) => {
            if (err) {
              msg.channel.stopTyping();
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
              str += `Description: ${data.description}\n`;
              str += '```';
              msg.channel.stopTyping();
              m.delete();
              msg.channel.sendFile(data.poster, `${data.title}.jpg`, str);
            }
          });
        })
        .catch(() => {
          msg.channel.stopTyping();
          msg.channel.sendMessage(`There was an error searching for: '${params.join(' ')}'.`);
        });
    })
    .catch(logger.error);
};
