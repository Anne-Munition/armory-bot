import axios from 'axios'

let channelId: string

function headers() {
  return {
    authorization: `Bearer ${process.env.STREAMELEMENTS_JWT}`,
  }
}

export async function init(): Promise<void> {
  const url = 'https://api.streamelements.com/kappa/v2/channels/me'
  const options = { headers: headers() }
  const { _id } = await axios.get(url, options).then(({ data }) => data)
  channelId = _id
}

export async function say(text: string): Promise<void> {
  const url = `https://api.streamelements.com/kappa/v2/bot/${channelId}/say`
  const options = { headers: headers() }
  const body = { message: text }
  return axios.post(url, body, options)
}
