'use strict';
exports.info = {
  desc: 'Search for data about a movie and post info and poster image.',
  usage: '<title>',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

const request = require('snekfetch');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if no params were passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  // Send a message so the user sees we are doing something while we query the web for movie info
  msg.channel.send(`Searching for \`\`${params.join(' ')}\`\`...`)
    .then(async m => {
      // Create the uri to search the movieDB with the text from discord
      const searchUri = client.utils.buildUri('https://api.themoviedb.org/3/search/movie', {
        api_key: client.config.movieDB.apiKey,
        query: params.join(' '),
      });
      // Search the movieDB
      const searchResults = client.utils.get(['body'], await request.get(searchUri));
      // Edit the waiting message with an error if no results from movieDB
      if (!searchResults || searchResults.total_results === 0) {
        m.edit(`No results found for: ${params.join(' ')}`).then(resolve).catch(reject);
        return;
      }
      // Create uri to get mor in-depth info about this movie title
      const movieUri = client.utils.buildUri(`https://api.themoviedb.org/3/movie/${searchResults.results[0].id}`, {
        api_key: client.config.movieDB.apiKey,
      });
      // Get more data
      const movie = client.utils.get(['body'], await request.get(movieUri));
      // This indicated a network error as we should have a valid movie id from the call above
      if (!movie) {
        m.edit(`Error getting results for: ${params.join(' ')}`).then(resolve).catch(reject);
        return;
      }
      // Build the embed description string with the movie data
      let str = '```apache\n';
      str += `Title: ${movie.title}\n`;
      str += `Released: ${movie.release_date}\n`;
      str += `Runtime: ${movie.runtime} minutes\n`;
      str += `Genre: ${movie.genres.map(g => g.name).join(', ')}\n`;
      str += `Description: '${movie.overview}'\n`;
      if (!movie.poster_path) str += '\nIMAGE NOT AVAILABLE';
      str += '```';
      const embed = new client.Discord.RichEmbed()
        .setDescription(str);
      if (movie.poster_path) {
        embed.setImage(`https://image.tmdb.org/t/p/original${movie.poster_path}`);
      }
      // Send the embed and remove the waiting message at the same time
      Promise.all([
        msg.channel.send({ embed }),
        m.delete(),
      ]).then(resolve).catch(reject);
    }).catch(reject);
});
