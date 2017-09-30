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
  msg.channel.send(`Searching for \`\`${params.join(' ')}\`\`...`)
    .then(async m => {
      const searchUri = client.utils.buildUri('https://api.themoviedb.org/3/search/movie', {
        api_key: client.config.movieDB.apiKey,
        query: params.join(' '),
      });
      const searchResults = client.utils.get(['body'], await request.get(searchUri));
      if (!searchResults || searchResults.total_results === 0) {
        m.edit(`No results found for: ${params.join(' ')}`).then(resolve).catch(reject);
        return;
      }
      const movieUri = client.utils.buildUri(`https://api.themoviedb.org/3/movie/${searchResults.results[0].id}`, {
        api_key: client.config.movieDB.apiKey,
      });
      const movie = client.utils.get(['body'], await request.get(movieUri));
      if (!movie) {
        m.edit(`No results found for: ${params.join(' ')}`).then(resolve).catch(reject);
        return;
      }
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
        // If there is no poster, post the movie info message
        embed.setImage(`https://image.tmdb.org/t/p/original${movie.poster_path}`);
      }
      Promise.all([
        msg.channel.send({ embed }),
        m.delete(),
      ]).then(resolve).catch(reject);
    }).catch(reject);
});
