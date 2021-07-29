import axios from 'axios'
import Discord from 'discord.js'
import log from '../logger'

export const info: CmdInfo = {
  desc: 'Search for data about a movie and post info and poster image.',
  usage: '<title>',
  aliases: [],
  permissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
  dmAllowed: true,
  paramsRequired: true,
}

export const run: Run = async function (msg, params): Promise<void> {
  if (!process.env.MOVIE_DB_APIKEY) {
    log.warn('Missing MOVIE_DB_APIKEY')
    return
  }

  const searchMsg = await msg.channel.send(
    `Searching TMDb  for \`\`${params.join(' ')}\`\`...`,
  )

  const searchResults: MovieSearchResponse = await axios
    .get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: process.env.MOVIE_DB_APIKEY,
        query: params.join(' '),
      },
    })
    .then(({ data }) => data)

  if (!searchResults || searchResults.total_results === 0) {
    await searchMsg.edit(`No results found for: ${params.join(' ')}`)
    return
  }

  const sorted = searchResults.results.sort(
    (a, b) => b.popularity - a.popularity,
  )

  const movie: Movie = await axios
    .get(`https://api.themoviedb.org/3/movie/${sorted[0].id}`, {
      params: { api_key: process.env.MOVIE_DB_APIKEY },
    })
    .then(({ data }) => data)

  if (!movie) {
    await searchMsg.edit(`Error getting results for: ${params.join(' ')}`)
    return
  }

  let str = '```apache\n'
  str += `Title: ${movie.title}\n`
  str += `Released: ${movie.release_date}\n`
  str += `Runtime: ${movie.runtime} minutes\n`
  str += `Genre: ${movie.genres
    .map((g: { name: string }) => g.name)
    .join(', ')}\n`
  str += `Description: '${movie.overview}'\n`
  if (!movie.poster_path) str += '\nIMAGE NOT AVAILABLE'
  str += '```'
  const embed = new Discord.MessageEmbed().setDescription(str)
  if (movie.poster_path) {
    embed.setImage(`https://image.tmdb.org/t/p/original${movie.poster_path}`)
  }
  if (movie.imdb_id) {
    embed.setTitle(`https://www.imdb.com/title/${movie.imdb_id}/`)
  }

  await searchMsg.edit({ embeds: [embed] })
}
