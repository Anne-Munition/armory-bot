import { ApplicationCommandOptionType } from 'discord.js';
import { getRandomInt } from '../utilities';

export const info: CmdInfo = {
  global: true,
};

export const structure: CmdStructure = {
  name: '8ball',
  description: 'Ask the magic 8ball a question.',
  options: [
    {
      name: 'question',
      type: ApplicationCommandOptionType.String,
      description: 'Your question for the 8ball.',
      required: true,
    },
  ],
};

const responses = [
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes, definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',
  'Reply hazy try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  "Don't count on it.",
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
];

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const question = interaction.options.getString('question', true);

  let answer = responses[getRandomInt(0, responses.length)];
  if (question.toLowerCase().includes('bed')) answer = 'No bed... cheater';
  if (interaction.user.id === process.env.OWNER_ID && question.endsWith('?')) answer = 'Of course!';

  await interaction.reply(`**Q:** *${question}*\n**A:** ${answer}`);
};
