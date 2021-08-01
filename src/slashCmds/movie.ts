import axios from 'axios'
import Discord from 'discord.js'
import log from '../logger'
import { palette } from '../utilities'

export const info: SlashCmdInfo = {
  global: true,
}

export const commandData: SlashCommandData = {
  name: 'movie',
  description: 'Search for data about a movie and post info and poster image.',
  options: [
    {
      name: 'title',
      type: 'STRING',
      description: 'Movie title.',
      required: true,
    },
    {
      name: 'year',
      type: 'INTEGER',
      description: 'Release Year',
    },
  ],
}

export const run: SlashRun = async (interaction): Promise<void> => {
  await interaction.defer()

  const query = interaction.options.getString('title', true)
  const year = interaction.options.getInteger('year')

  let queryStr = query
  if (year) queryStr += ` (${year})`
  log.debug(queryStr)

  const searchResults: MovieSearchResponse = await axios
    .get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: process.env.MOVIE_DB_APIKEY,
        query: encodeURIComponent(query),
      },
    })
    .then(({ data }) => data)
  log.debug(`movie search results: ${searchResults?.total_results}`)

  if (!searchResults || searchResults.total_results === 0) {
    await interaction.editReply(`No results found for: ${queryStr}`)
    return
  }

  const toSearch = year
    ? searchResults.results.filter((x) => {
        return x.release_date.slice(0, 4) === year.toString()
      })
    : searchResults.results
  log.debug(`movies to sort: ${toSearch.length}`)

  if (!toSearch.length) {
    await interaction.editReply(`No results found for: ${queryStr}`)
    return
  }

  const sorted = toSearch.sort((a, b) => b.popularity - a.popularity)

  const movie: Movie = await axios
    .get(`https://api.themoviedb.org/3/movie/${sorted[0].id}`, {
      params: { api_key: process.env.MOVIE_DB_APIKEY },
    })
    .then(({ data }) => data)

  if (!movie) {
    await interaction.editReply(`Error getting results for: ${query}`)
    return
  }

  let str = `Title: ${movie.title}\n`
  str += `Released: ${movie.release_date}\n`
  str += `Runtime: ${movie.runtime} minutes\n`
  str += `Genre: ${movie.genres
    .map((g: { name: string }) => g.name)
    .join(', ')}\n`
  str += `Description: '${movie.overview}'\n`
  if (!movie.poster_path) str += '\nIMAGE NOT AVAILABLE'

  const codeBlock = Discord.Formatters.codeBlock('apache', str)
  const embed = new Discord.MessageEmbed().setDescription(codeBlock)
  if (movie.poster_path) {
    const image = `https://image.tmdb.org/t/p/original${movie.poster_path}`
    const color = await palette(image)
    embed.setImage(image)
    if (color) embed.setColor(color)
  }
  if (movie.imdb_id) {
    embed.setTitle(`https://www.imdb.com/title/${movie.imdb_id}/`)
  }

  await interaction.editReply({ embeds: [embed] })
}
