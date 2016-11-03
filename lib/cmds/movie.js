'use strict';
exports.info = {
  desc: 'Search for data about a movie and post info and poster image.',
  usage: '<movie>',
  aliases: [],
};

const utils = require('../utilities');
const logger = require('winston');

exports.run = (client, msg, params = []) => {
  // Exit if no params were passed
  if (params.length === 0) {
    logger.debug('No parameters have been passed to movie');
    return;
  }
  msg.channel.sendMessage(`Searching for \`\`${params.join(' ')}\`\`...`)
    .then(m => {
      const uri = `http://www.omdbapi.com/?t=${params.join(' ')}&r=json`;
      utils.jsonRequest(uri)
        .then(body => {
          logger.debug('movie response', body);
          if (!body.Response || body.Response === 'False') {
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
            // If there is no poster, post the movie info message
            msg.channel.sendMessage(str);
          } else {
            // Otherwise post the data as content for the movie poster
            msg.channel.sendFile(body.Poster, `${body.Title}.jpg`, str);
          }
          // Delete the 'Searching' message as the result is being posted
          m.delete();
          utils.finish(client, msg, exports.name);
        })
        .catch(() => {
          m.edit(`Error searching for: ${params.join(' ')}`);
        });
    })
    .catch(logger.error);
};
