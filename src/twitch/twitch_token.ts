import axios from 'axios'
import log from './logger'

let token: Token

interface Token {
  client_id: string
  access_token: string
}

export async function fetchToken(): Promise<void> {
  return new Promise((resolve) => {
    log.info('Fetching Twitch Tokens')
    axios
      .get(<string>process.env.TOKEN_URL, {
        headers: {
          'x-api-key': process.env.TOKEN_API_KEY,
        },
      })
      .then(({ data }) => {
        token = data
        resolve()
      })
  })
}

export function getToken(): Token {
  return token
}
