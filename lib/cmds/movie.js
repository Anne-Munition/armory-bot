'use strict';
exports.info = {
  desc: 'Search for data about a movie and post info and poster image.',
  usage: '<title>',
  aliases: [],
};

const utils = require('../utilities');
const logger = require('winston');

exports.run = (client, msg, params = []) => new Promise(resolve => {
  // Exit if no params were passed
  if (params.length === 0) {
    utils.usage(msg, exports.info);
    return resolve();
  }
  msg.channel.sendMessage(`Searching for \`\`${params.join(' ')}\`\`...`)
    .then(async m => {
      const uri = `http://www.omdbapi.com/?t=${params.join(' ')}&r=json`;
      const movie = await utils.requestJSON(uri);
      logger.debug('movie response', movie);
      if (!movie.Response || movie.Response === 'False') {
        m.edit(`No results found for: ${params.join(' ')}`);
        return resolve();
      }
      let str = '```apache\n';
      str += `Title: ${movie.Title}\n`;
      str += `Year: ${movie.Year}\n`;
      str += `Rating: ${movie.Rated}\n`;
      str += `Runtime: ${movie.Runtime}\n`;
      str += `Genre: ${movie.Genre}\n`;
      str += `Actors: ${movie.Actors}\n\n`;
      str += `Description: '${movie.Plot}'\n`;
      if (!movie.Poster || movie.Poster === 'N/A') {
        str += '\nIMAGE NOT AVAILABLE';
      }
      str += '```';
      const embed = {
        color: utils.randomColorInt(),
        description: str,
      };
      if (movie.Poster && movie.Poster !== 'N/A') {
        // If there is no poster, post the movie info message
        embed.image = {
          url: movie.Poster,
        };
      }
      msg.channel.sendMessage('', { embed });
      // Delete the 'Searching' message as the result is being posted
      m.delete();
      return resolve();
    });
  return null;
});
