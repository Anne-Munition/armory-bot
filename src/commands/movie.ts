import axios from 'axios';
import Discord, { ApplicationCommandOptionType } from 'discord.js';
import log from '../logger';
import { palette } from '../utilities';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: 'movie',
  description: 'Post TMDB movie info and poster.',
  options: [
    {
      name: 'title',
      type: ApplicationCommandOptionType.String,
      description: 'Movie title.',
      required: true,
    },
    {
      name: 'year',
      type: ApplicationCommandOptionType.Integer,
      description: 'Release Year',
    },
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  await interaction.deferReply();

  const query = interaction.options.getString('title', true);
  const year = interaction.options.getInteger('year');

  let queryStr = query;
  if (year) queryStr += ` (${year})`;
  log.debug(queryStr);

  const searchResults: TMDBSearchResponse = await axios
    .get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: process.env.MOVIE_DB_KEY,
        query,
        primary_release_year: year,
        include_adult: false,
      },
    })
    .then(({ data }) => data);
  log.debug(`movie search results: ${searchResults?.total_results}`);

  if (!searchResults || searchResults.total_results === 0) {
    await interaction.editReply(`No results found for: ${queryStr}`);
    return;
  }

  const sorted = searchResults.results.sort((a, b) => b.popularity - a.popularity);

  const movie: Movie = await axios
    .get(`https://api.themoviedb.org/3/movie/${sorted[0].id}`, {
      params: { api_key: process.env.MOVIE_DB_KEY },
    })
    .then(({ data }) => data);

  if (!movie) {
    await interaction.editReply(`Error getting movie results for: ${queryStr}`);
    return;
  }

  let str = `
Title: ${movie.title}
Released: ${movie.release_date}
Runtime: ${movie.runtime} minutes
Genre: ${movie.genres.map((g: { name: string }) => g.name).join(', ')}
Description: "${movie.overview}"
`;
  if (!movie.poster_path) str += '\n\nIMAGE NOT AVAILABLE';

  const codeBlock = Discord.Formatters.codeBlock('apache', str);
  const embed = new Discord.EmbedBuilder().setDescription(codeBlock);

  if (movie.poster_path) {
    const image = `https://image.tmdb.org/t/p/original${movie.poster_path}`;
    embed.setImage(image);
    const color = await palette(image);
    if (color) embed.setColor(color);
  }
  if (movie.imdb_id) {
    embed.setTitle(`https://www.imdb.com/title/${movie.imdb_id}/`);
  }

  await interaction.editReply({ embeds: [embed] });
};
