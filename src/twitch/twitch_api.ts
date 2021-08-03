import axios from 'axios'

function helixHeaders(): { [key: string]: string } {
  return {
    authorization: `Bearer ${process.env.TWITCH_ACCESS_TOKEN}`,
    'client-id': process.env.TWITCH_CLIENT_ID || '',
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
