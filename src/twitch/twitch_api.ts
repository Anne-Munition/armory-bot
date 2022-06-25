import axios from 'axios'
import { ignore, ownerError } from '../utilities'
import * as token from './twitch_token'

function helixHeaders(): { [key: string]: string } {
  const keys = token.getToken()
  return {
    authorization: `Bearer ${keys.access_token}`,
    'client-id': keys.client_id,
  }
}

export function getUsers(identities: string[]): Promise<HelixUser[]> {
  const query = identities
    .map((x) => {
      const type = /^\d+$/.test(x) ? 'id' : 'login'
      return `${type}=${encodeURIComponent(x)}`
    })
    .join('&')
  const url = `https://api.twitch.tv/helix/users?${query}`
  const options = { headers: helixHeaders() }
  return axios.get(url, options).then(({ data }) => data.data)
}

export function getSubscription(userId: string): Promise<HelixSubscription[]> {
  const url = 'https://api.twitch.tv/helix/subscriptions'
  const options = {
    headers: helixHeaders(),
    params: {
      user_id: userId,
      broadcaster_id: process.env.TWITCH_ID,
    },
  }
  return axios.get(url, options).then(({ data }) => data.data)
}

export function getStreams(identities: string[]): Promise<HelixStream[]> {
  const query = identities
    .map((x) => {
      const type = /^\d+$/.test(x) ? 'user_id' : 'user_login'
      return `${type}=${encodeURIComponent(x)}`
    })
    .join('&')
  const url = `https://api.twitch.tv/helix/streams?${query}`
  const options = { headers: helixHeaders() }
  return axios.get(url, options).then(({ data }) => data.data)
}

export function getFollows(userId: string, channelId: string): Promise<HelixFollow[]> {
  const url = 'https://api.twitch.tv/helix/users/follows'
  const options = {
    headers: helixHeaders(),
    params: {
      from_id: userId,
      to_id: channelId,
    },
  }
  return axios.get(url, options).then(({ data }) => data.data)
}

export function getChannelColors(userIds: string[]): Promise<string | null[]> {
  const url = 'https://gql.twitch.tv/gql'
  const options = {
    headers: {
      'Client-ID': 'kimne78kx3ncx6brgo4mv6wki5h1ko',
    },
  }
  const body = {
    query: `
      query PrimaryColor {
        users(ids: ${userIds}) {
          primaryColorHex
        }
      }
    `,
  }
  return axios
    .post(url, body, options)
    .then(({ data }) => {
      if (data.errors) {
        ownerError('GQL Error - Channel Colors', undefined, data.errors[0].message).catch(ignore)
        return
      }
      return data.data.users.map((x: null | { primaryColorHex: string }) => {
        if (x && x.primaryColorHex) return x.primaryColorHex
        return null
      })
    })
    .catch((err) => {
      ownerError('GQL Error - Channel Colors', err).catch(ignore)
    })
}
