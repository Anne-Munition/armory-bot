import { getRandomInt } from '../utilities'

export const info: SlashInfo = {
  global: true,
}

export const commandData: SlashData = {
  name: '8ball',
  description: 'Ask the magic 8ball a question.',
  options: [
    {
      name: 'question',
      type: 'STRING',
      description: 'Your question for the 8ball.',
      required: true,
    },
  ],
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

export const run: SlashRun = async (interaction): Promise<void> => {
  const question = interaction.options.getString('question', true)

  let response = responses[getRandomInt(0, responses.length)]
  if (interaction.user.id === process.env.OWNER_ID && question.endsWith('?'))
    response = 'Of course!'

  await interaction.reply(`**Q:** *${question}*\n**A:** ${response}`)
}