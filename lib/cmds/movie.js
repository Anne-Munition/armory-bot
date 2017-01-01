'use strict';
exports.info = {
  desc: 'Search for data about a movie and post info and poster image.',
  usage: '<title>',
  aliases: [],
};

exports.run = (client, msg, params = []) => new Promise((resolve, reject) => {
  // Exit if no params were passed
  if (params.length === 0) {
    client.utils.usage(msg, exports.info).then(resolve).catch(reject);
    return;
  }
  msg.channel.sendMessage(`Searching for \`\`${params.join(' ')}\`\`...`)
    .then(async m => {
      const uri = `http://www.omdbapi.com/?t=${params.join(' ')}&r=json`;
      const movie = await client.utils.requestJSON(uri);
      client.logger.debug('movie response', movie);
      if (!movie.Response || movie.Response === 'False') {
        m.edit(`No results found for: ${params.join(' ')}`).then(resolve).catch(reject);
        return;
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
      const embed = new client.Discord.RichEmbed()
        .setColor(client.utils.randomColorInt())
        .setDescription(str);
      if (movie.Poster && movie.Poster !== 'N/A') {
        // If there is no poster, post the movie info message
        embed.setImage(movie.Poster);
      }
      const promiseArray = [
        msg.channel.sendEmbed(embed),
        m.delete(),
      ];
      Promise.all(promiseArray)
        .then(resolve).catch(reject);
    }).catch(reject);
});
