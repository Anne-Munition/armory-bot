import * as se from '../../streamelements/index'
import * as twitchApi from '../../twitch/twitch_api'
import { goingLiveUrl, name } from '../config'
import tweetHandler from '../tweetHandler'

const announceSpy = jest.spyOn(se, 'announce').mockImplementation(() => {
  return Promise.resolve()
})

jest.mock('../../logger')
jest.mock('node-vibrant', () => {
  return {}
})

describe('dataConsumer', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('announces tweet', async () => {
    const tweet: Tweet = {
      id: '1',
      text: 'Tweet body.',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      `New tweet from ${name}: "Tweet body." https://twitter.com/${name}/status/1`,
    )
  })

  it('removes extra newlines and spaces', async () => {
    const tweet: Tweet = {
      id: '2',
      text: 'Tweet \n\n     body.     ',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      `New tweet from ${name}: "Tweet body." https://twitter.com/${name}/status/2`,
    )
  })

  it('formats differently if no text body remains', async () => {
    const tweet: Tweet = {
      id: '3',
      text: '    ',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      `New tweet from ${name}: https://twitter.com/${name}/status/3`,
    )
  })

  it('removes url entities', async () => {
    const tweet: Tweet = {
      id: '4',
      text: `Tweet body.\n\n${goingLiveUrl}`,
      entities: {
        urls: [
          {
            start: 17,
            end: 39,
            url: goingLiveUrl,
            expanded_url: 'http://twitch.tv/annemunition',
          },
        ],
      },
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      `New tweet from ${name}: "Tweet body." https://twitter.com/${name}/status/4`,
    )
  })

  it('does not announce if stream is not live', async () => {
    const tweet: Tweet = {
      id: '5',
      text: 'Tweet body.',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([])
    })

    await tweetHandler(tweet)

    expect(announceSpy).not.toHaveBeenCalled()
  })

  it('does announce if stream is not live, but twitch stream link is in text', async () => {
    const tweet: Tweet = {
      id: '6',
      text: 'Tweet body.\n\nhttps://t.co/UEDLazk7gU',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalled()
  })

  it('does not announce if tweet is a reply', async () => {
    const tweet: Tweet = {
      id: '7',
      text: 'Tweet body.',
      in_reply_to_user_id: '654321',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).not.toHaveBeenCalled()
  })

  it('handles duplicate tweets up to 10', async () => {
    const tweet: Tweet = {
      id: '8',
      text: 'Tweet body.',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)
    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledTimes(1)
  })
})
