'use strict';
exports.info = {
  name: 'imdb',
  desc: 'Get data about a movie',
  usage: 'imdb <movie>',
};

const fetch = require('node-fetch');
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
          if (!body.Response && body.Response !== 'True') {
            m.edit(`No results found for: ${params.join(' ')}`);
            return;
          }
          let str = '```apache\n';
          str += `Title: ${body.Title}\n`;
          str += `Year: ${body.Year}\n`;
          str += `Rating: ${body.Rated}\n`;
          str += `Runtime: ${body.Runtime}\n`;
          str += `Genre: ${body.Genre}\n`;
          str += `Actors: ${body.Actors}\n\n`;
          str += `Description: '${body.Plot}'\n`;
          if (!body.Poster || body.Poster === 'N/A') {
            str += '\nIMAGE NOT AVAILABLE';
          }
          str += '```';
          if (!body.Poster || body.Poster === 'N/A') {
            msg.channel.sendMessage(str);
          } else {
            msg.channel.sendFile(body.Poster, `${body.Title}.jpg`, str);
          }
          m.delete();
        })
        .catch(() => {
          m.edit(`Error searching for: ${params.join(' ')}`);
        });
    })
    .catch(logger.error);
};
