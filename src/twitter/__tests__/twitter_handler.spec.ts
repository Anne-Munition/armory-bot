import { TweetV2 } from 'twitter-api-v2'
import * as se from '../../streamelements/index'
import * as twitchApi from '../../twitch/twitch_api'
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
    const tweet: TweetV2 = {
      id: '1',
      text: 'Tweet body.',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      'New tweet from DBK_Test: "Tweet body." https://twitter.com/DBK_Test/status/1',
    )
  })

  it('removes extra newlines and spaces', async () => {
    const tweet: TweetV2 = {
      id: '2',
      text: 'Tweet \n\n     body.     ',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      'New tweet from DBK_Test: "Tweet body." https://twitter.com/DBK_Test/status/2',
    )
  })

  it('formats differently if no text body remains', async () => {
    const tweet: TweetV2 = {
      id: '3',
      text: '    ',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      'New tweet from DBK_Test: https://twitter.com/DBK_Test/status/3',
    )
  })

  it('removes url entities', async () => {
    const tweet: TweetV2 = {
      id: '4',
      text: `Tweet body.\n\nhttps://t.co/fY6jRa5Hrc`,
      entities: {
        urls: [
          {
            start: 17,
            end: 39,
            url: 'https://t.co/fY6jRa5Hrc',
            expanded_url: 'http://twitch.tv/annemunition',
            display_url: '',
            unwound_url: '',
          },
        ],
        annotations: [],
        hashtags: [],
        cashtags: [],
        mentions: [],
      },
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      'New tweet from DBK_Test: "Tweet body." https://twitter.com/DBK_Test/status/4',
    )
  })

  it('does not announce if stream is not live', async () => {
    const tweet: TweetV2 = {
      id: '5',
      text: 'Tweet body.',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([])
    })

    await tweetHandler(tweet)

    expect(announceSpy).not.toHaveBeenCalled()
  })

  it('does announce if stream is not live, but twitch stream link is in entity urls', async () => {
    const tweet: TweetV2 = {
      id: '6',
      text: `Tweet body.\n\nhttps://t.co/fY6jRa5Hrc`,
      entities: {
        urls: [
          {
            start: 17,
            end: 39,
            url: 'https://t.co/fY6jRa5Hrc',
            expanded_url: 'http://twitch.tv/annemunition',
            display_url: '',
            unwound_url: '',
          },
        ],
        annotations: [],
        hashtags: [],
        cashtags: [],
        mentions: [],
      },
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalled()
  })

  it('does not announce if tweet is a reply', async () => {
    const tweet: TweetV2 = {
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

  it('handles duplicate tweets', async () => {
    const tweet: TweetV2 = {
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

  it('remove double quotes from the start and end of text body', async () => {
    const tweet: TweetV2 = {
      id: '9',
      text: '"Tweet body."',
    }
    jest.spyOn(twitchApi, 'getStreams').mockImplementation(() => {
      return Promise.resolve([{} as HelixStream])
    })

    await tweetHandler(tweet)

    expect(announceSpy).toHaveBeenCalledWith(
      'New tweet from DBK_Test: "Tweet body." https://twitter.com/DBK_Test/status/9',
    )
  })
})
