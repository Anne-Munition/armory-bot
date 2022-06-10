import fs from 'fs'
import path from 'path'
import nock from 'nock'
import { run } from './pun'

const slug = path.join(__dirname, '../__slugs__', 'pun.html')

const mockInteraction = {
  deferReply: jest.fn(),
  editReply: jest.fn(),
  client: {
    emojis: {
      cache: {
        get(id: string) {
          return id
        },
      },
    },
  },
}

describe('pun command', () => {
  test('run', async () => {
    nock('https://pun.me').get('/random/').reply(200, fs.readFileSync(slug))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction)
    expect(mockInteraction.deferReply).toHaveBeenCalled()
    expect(mockInteraction.editReply).toHaveBeenCalled()
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      "**Pun #8** - Enough with the cripple jokes! ...I just can't stand them. 458811307718868993",
    )
  })

  test('no data', async () => {
    nock('https://pun.me').get('/random/').reply(200, '<html></html>')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(run(mockInteraction)).rejects.toThrowError(
      'Unable to extract pun.',
    )
  })
})
