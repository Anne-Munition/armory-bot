interface TMDBSearch {
  adult: boolean
  backdrop_path: string | null
  genre_ids: number[]
  id: number
  original_language: string
  original_title: string
  overview: string
  popularity: number
  poster_path: string | null
  release_date: string
  title: string
  video: boolean
  vote_average: number
  vote_count: number
}

interface TMDBSearchResponse {
  total_pages: number
  total_results: number
  page: number
  results: TMDBSearch[]
}

interface Genre {
  id: number
  name: string
}

interface ProductionCompanies {
  id: number
  logo_path: string | null
  name: string
  origin_country: string
}

interface ProductionCountries {
  iso_3166_1: string
  name: string
}

interface SpokenLanguages {
  english_name: string
  iso_639_1: string
  name: string
}

interface Movie {
  adult: boolean
  backdrop_path: string | null
  belongs_to_collection: unknown | null
  budget: number
  genres: Genre[]
  homepage: string | null
  id: number
  imdb_id: string | null
  original_language: string
  original_title: string
  overview: string | null
  popularity: number
  poster_path: string | null
  production_companies: ProductionCompanies[]
  production_countries: ProductionCountries[]
  release_date: string
  revenue: number
  runtime: number | null
  spoken_languages: SpokenLanguages[]
  status: string
  tagline: string | null
  title: string
  video: boolean
  vote_average: number
  vote_count: number
}
