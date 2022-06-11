import fs from 'fs'
import path from 'path'
import nock from 'nock'
import { run } from '../fact'

const slug = path.join(__dirname, '../__slugs__', 'fact.html')

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

describe('fact command', () => {
  test('run', async () => {
    nock('https://snapple.com').get('/real-facts').reply(200, fs.readFileSync(slug))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await run(mockInteraction)
    expect(mockInteraction.deferReply).toHaveBeenCalled()
    expect(mockInteraction.editReply).toHaveBeenCalled()
    expect(mockInteraction.editReply).toHaveBeenCalledWith(
      '**Fact #694** - Spiny lobsters migrate in groups of 50 or more, forming a conga line on the ocean floor. 454917053069918209',
    )
  })

  test('no data', async () => {
    nock('https://snapple.com').get('/real-facts').reply(200, '<html></html>')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await expect(run(mockInteraction)).rejects.toThrowError('Unable to extract fact.')
  })
})
