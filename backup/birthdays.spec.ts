import { MongoMemoryServer } from 'mongodb-memory-server'
import * as database from '../src/database'
import BirthdayModel from '../src/database/models/birthday_model'
import BirthdayService from '../src/database/services/birthday_service'
import { run } from '../src/commands/birthday'

describe('birthday command module', () => {
  let mongoServer: MongoMemoryServer

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    await database.connect(mongoServer.getUri())
    await BirthdayModel.deleteMany({})
  })

  afterAll(async () => {
    await database.disconnect()
    if (mongoServer) await mongoServer.stop()
  })

  it('should be able to add a birthday', async () => {
    await BirthdayService.add('1234', '02/07', 'Feburary 7')
    const actual = await BirthdayService.find('1234')
    expect(actual).toBeTruthy()
    expect(actual?.edits_remaining).toBe(5)
    expect(actual?.active).toBe(true)
  })

  it('can deactivate a birthday', async () => {
    await BirthdayService.deactivate('1234')
    const actual = await BirthdayService.find('1234')
    expect(actual?.active).toBe(false)
  })

  it('can reactivate a birthday', async () => {
    await BirthdayService.activate('1234')
    const actual = await BirthdayService.find('1234')
    expect(actual?.active).toBe(true)
  })

  it('decrements the edit remaining count when updated', async () => {
    await BirthdayService.update('1234', '01/18', 'January 18')
    const actual = await BirthdayService.find('1234')
    expect(actual?.edits_remaining).toBe(4)
  })

  let subcommand: string | null = null
  let options: { [key: string]: string } = {}
  const interaction = {
    deferReply: () => Promise.resolve(),
    user: {
      id: '9999',
    },
    options: {
      getSubcommand: () => subcommand,
      getString: (key: string) => {
        return options[key]
      },
    },
    editReply: jest.fn(),
  }

  describe('command interaction', () => {
    beforeEach(async () => {
      await BirthdayModel.deleteMany({})
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    describe('remove subcommand', () => {
      beforeAll(() => {
        subcommand = 'remove'
      })

      it('reports if we are not in the database', async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await run(interaction)
        expect(interaction.editReply).toHaveBeenCalledTimes(1)
        expect(interaction.editReply).toHaveBeenCalledWith(
          'Your birthday is not currently announced.',
        )
      })

      it('deactivates our doc if we have one', async () => {
        await BirthdayService.add('9999', '01/14', 'January 14')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await run(interaction)
        expect(interaction.editReply).toHaveBeenCalledTimes(1)
        expect(interaction.editReply).toHaveBeenCalledWith(
          'Your birthday will no longer be announced.',
        )
        const doc = await BirthdayService.find('9999')
        expect(doc?.active).toBe(false)
      })
    })

    describe('add subcommand', () => {
      beforeAll(() => {
        subcommand = 'add'
      })

      describe('date format checks', () => {
        it('returns invalid date if not dd/dd', async () => {
          options = {
            locale: 'en-us',
            birthdate: '1/ab',
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await run(interaction)
          expect(interaction.editReply).toHaveBeenCalledTimes(1)
          expect(interaction.editReply).toHaveBeenCalledWith('Invalid date.')
        })

        it('returns invalid date if not a valid date', async () => {
          options = {
            locale: 'en-us',
            birthdate: '99/99',
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await run(interaction)
          expect(interaction.editReply).toHaveBeenCalledTimes(1)
          expect(interaction.editReply).toHaveBeenCalledWith('Invalid date.')
        })
      })

      describe('no doc present', () => {
        it('creates a doc if one is not present', async () => {
          options = {
            locale: 'en-us',
            birthdate: '1/11',
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await run(interaction)
          expect(interaction.editReply).toHaveBeenCalledTimes(1)
          expect(interaction.editReply).toHaveBeenCalledWith(
            'Your birthday will now be announced: ``January 11``',
          )
          const count = await BirthdayModel.countDocuments()
          expect(count).toBe(1)
        })

        it('formats the response differently if different region', async () => {
          options = {
            locale: 'en-gb',
            birthdate: '1/11',
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await run(interaction)
          expect(interaction.editReply).toHaveBeenCalledTimes(1)
          expect(interaction.editReply).toHaveBeenCalledWith(
            'Your birthday will now be announced: ``1 November``',
          )
          const count = await BirthdayModel.countDocuments()
          expect(count).toBe(1)
        })
      })

      describe('doc present', () => {
        it('tells us we are already being announced if active and the dates match', async () => {
          await BirthdayService.add('9999', '01/01', 'January 1')

          options = {
            locale: 'en-us',
            birthdate: '1/1',
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await run(interaction)
          expect(interaction.editReply).toHaveBeenCalledTimes(1)
          expect(interaction.editReply).toHaveBeenCalledWith(
            'Your birthday is already announced: ``January 1``',
          )
        })

        it('reactivates the doc if dates match', async () => {
          await BirthdayService.add('9999', '01/22', 'January 22')
          await BirthdayService.deactivate('9999')

          let doc = await BirthdayService.find('9999')
          expect(doc?.active).toBe(false)

          options = {
            locale: 'en-us',
            birthdate: '1/22',
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await run(interaction)
          expect(interaction.editReply).toHaveBeenCalledTimes(1)
          expect(interaction.editReply).toHaveBeenCalledWith(
            'Your birthday will now be announced: ``January 22``',
          )

          doc = await BirthdayService.find('9999')
          expect(doc?.active).toBe(true)
        })

        it('only lets you edit a doc 5 times then deactivates', async () => {
          await BirthdayService.add('9999', '05/01', 'January 1')
          for (let i = 1; i <= 5; i++) {
            options = {
              locale: 'en-us',
              birthdate: `1/${i}`,
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await run(interaction)
            expect(interaction.editReply).toHaveBeenCalledTimes(i)
            expect(interaction.editReply).toHaveBeenCalledWith(
              `Your birthday has been updated to: \`\`January ${i}\`\``,
            )
          }

          options = {
            locale: 'en-us',
            birthdate: '2/15',
          }
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await run(interaction)
          expect(interaction.editReply).toHaveBeenCalledWith(
            'You have exceeded the allotted number of birthdate edits. Please DM DBKynd and explain why you needed to alter your birthdate so much.',
          )

          const doc = await BirthdayService.find('9999')
          expect(doc?.active).toBe(false)
        })
      })
    })
  })
})
