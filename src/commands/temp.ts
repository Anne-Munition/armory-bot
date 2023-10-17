import { ApplicationCommandOptionType } from 'discord.js';
import tuc from 'temp-units-conv';

export const info: CmdInfo = {
  global: true,
};

const tempChoices = [
  {
    name: 'Celsius',
    value: 'c',
  },
  {
    name: 'Fahrenheit',
    value: 'f',
  },
  {
    name: 'Kelvin',
    value: 'k',
  },
];

export const structure: CmdStructure = {
  name: 'temp',
  description: 'Convert a temperature.',
  options: [
    {
      name: 'degrees',
      type: ApplicationCommandOptionType.Number,
      description: 'Temperature value to convert',
      required: true,
    },
    {
      name: 'from',
      type: ApplicationCommandOptionType.String,
      description: 'Temperature unit to convert FROM.',
      required: true,
      choices: tempChoices,
    },
    {
      name: 'to',
      type: ApplicationCommandOptionType.String,
      description: 'Temperature unit to convert TO.',
      required: true,
      choices: tempChoices,
    },
  ],
};

export const run: ChatCmdRun = async (interaction): Promise<void> => {
  const degrees = interaction.options.getNumber('degrees', true);
  const from = interaction.options.getString('from', true);
  const to = interaction.options.getString('to', true);

  const converted = tuc[`${from}2${to}`](degrees);
  const trimmed = Math.floor(converted * 10) / 10;

  await interaction.reply(
    `${degrees}*${from.toUpperCase()}* = **${trimmed}*${to.toUpperCase()}***`,
  );
};
