import { getRandomInt } from '../utilities'

export const info: CmdInfo = {
  desc: 'Responds with an 8ball message when asked a question.',
  usage: '<question>',
  aliases: [],
  permissions: ['SEND_MESSAGES'],
  dmAllowed: true,
  paramsRequired: true,
}

const responses = [
  'It is certain',
  'It is decidedly so',
  'Without a doubt',
  'Yes, definitely',
  'You may rely on it',
  'As I see it, yes',
  'Most likely',
  'Outlook good',
  'Yes',
  'Signs point to yes',
  'Reply hazy try again',
  'Ask again later',
  'Better not tell you now',
  'Cannot predict now',
  'Concentrate and ask again',
  "Don't count on it",
  'My reply is no',
  'My sources say no',
  'Outlook not so good',
  'Very doubtful',
]

export const run: Run = async function (msg, params): Promise<void> {
  let response = responses[getRandomInt(0, responses.length)]
  if (
    msg.author.id === process.env.OWNER_ID &&
    params[params.length - 1].endsWith('?')
  )
    response = 'Of course!'

  await msg.reply(response)
}
