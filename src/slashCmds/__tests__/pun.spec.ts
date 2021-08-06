import fs from 'fs'
import path from 'path'
import nock from 'nock'
import { run } from '../pun'

const slug = path.join(__dirname, '../__slugs__', 'pun.html')
nock('https://pun.me').get('/random/').reply(200, fs.readFileSync(slug))

const mockInteraction = {
  defer: jest.fn(),
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction)
    expect(mockInteraction.defer).toHaveBeenCalled()
    expect(mockInteraction.editReply).toHaveBeenCalled()
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      "**Pun #8** - Enough with the cripple jokes! ...I just can't stand them. 458811307718868993",
    )
  })
})
