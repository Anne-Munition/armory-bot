'use strict';
exports.info = {
  desc: 'Search for data about a movie and post info and poster image.',
  usage: '<title>',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
};

const qs = require('querystring');

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if no params were passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  msg.channel.send(`Searching for \`\`${params.join(' ')}\`\`...`)
    .then(async m => {
      const searchUri = `https://api.themoviedb.org/3/search/movie?${qs.stringify({
        api_key: client.config.movieDB.apiKey,
        query: params.join(' '),
      })}`;
      const searchResults = await client.utils.requestJSON(searchUri);
      if (!searchResults || searchResults.total_results === 0) {
        m.edit(`No results found for: ${params.join(' ')}`).then(resolve).catch(reject);
        return;
      }
      const movieUri = `https://api.themoviedb.org/3/movie/${searchResults.results[0].id}?${qs.stringify({
        api_key: client.config.movieDB.apiKey,
      })}`;
      const movie = await client.utils.requestJSON(movieUri);
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
